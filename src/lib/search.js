/**
 * Babbling Banks search engine.
 *
 * Pure functions over the episode catalog. The engine builds a small index
 * once (canonicalised tokens for every searchable field, plus the vocabulary
 * of every word the catalog knows) and scores each episode against the query
 * with a mix of phrase matches, fuzzy token matches and a coverage factor so
 * multi-word descriptions rank sensibly.
 *
 * Nothing in here touches the DOM, so it is unit-tested directly.
 */
import { EPISODES, SHOWS } from '../data/index.js';
import { tokenize, canonicalToken, fuzzyEquals, normalizeText, STOPWORDS } from './text.js';

const WEIGHTS = {
  titleExact: 200,
  titleCompact: 190,
  titlePhrase: 110,
  titleContained: 90,
  titleToken: 40,
  titleFuzzyToken: 24,
  aliasExact: 180,
  aliasPhrase: 85,
  aliasTokenMax: 60,
  songExact: 170,
  songPhrase: 120,
  songTokenMax: 70,
  characterExact: 50,
  characterToken: 30,
  objectToken: 25,
  themeToken: 15,
  settingToken: 15,
  descriptionToken: 6,
  showToken: 20,
  fullCoverageBonus: 30,
  episodeReference: 250,
  seasonReference: 60,
};

/**
 * What the other readings of a query word are worth next to an exact match (1).
 * A typo of a word the catalog has never seen ("xilaphone") is read as the
 * nearest word at full credit; a near miss of a word it does know ("bluey" is
 * a real word, so an entry that only has "blue" is probably not it) is worth
 * much less. Toddler pronunciations and clipped words sit in between.
 */
const QUALITY = {
  typo: 1,
  knownFuzzy: 0.4,
  toddlerSound: 0.85,
  clipped: 0.8,
};
/** A whole title or alias read with a typo is worth this much of the exact match. */
const NEAR_MATCH = 0.95;

/**
 * How much a word is worth for being rare. "drainpipe" (one episode) says
 * more than "play" (hundreds), so rare words count more in descriptions,
 * objects and coverage. 1 is a word used by about fifty episodes.
 */
const RARITY = { min: 0.25, max: 2.5, typicalDocuments: 50 };

/**
 * How a two-year-old says grown-up sounds: [what they say, what the word has].
 * A query word the catalog does not know is retried with each substitution,
 * and the result counts only when the catalog knows that word exactly.
 */
const TODDLER_SOUNDS = [
  ['w', 'r'], // wabbit, wock
  ['w', 'l'], // wion, bawoon
  ['l', 'y'], // lellow
  ['y', 'l'], // yeyo
  ['t', 'k'], // tite
  ['t', 'c'], // tat, tar
  ['d', 'g'], // dod, doat
  ['s', 'sh'], // sip, fis
  ['ss', 'sh'], // fiss
  ['t', 'ch'], // tair
  ['d', 'j'], // duice, dump
  ['p', 'f'], // pish
  ['b', 'v'], // ban
  ['b', 'p'], // bider
  ['f', 'th'], // toof, teef, baf, birfday
  ['d', 'th'], // dat, dis
  ['t', 'th'], // tank, bat
  ['v', 'th'], // wiv, muvver
  ['t', 's'], // tun, tock
  ['d', 'z'], // doo
];

/** Season/episode references a parent might type: "s2e5", "2x05", "season 2 episode 5". */
const REFERENCE_PATTERNS = [/\bs(\d{1,2})\s*e(\d{1,3})\s*([ab])?\b/, /\b(\d{1,2})x(\d{1,3})\b/];
const SEASON_PATTERN = /\bseason\s*(\d{1,2})\b/;
const EPISODE_PATTERN = /\b(?:episode|ep)\s*(\d{1,3})\s*([ab])?\b/;

/**
 * Below full coverage the score shrinks towards this fraction as fewer of
 * the query words match: a two-word query that matched one word keeps 75%.
 */
const COVERAGE_FLOOR = 0.5;

const compact = (text) => normalizeText(text).replace(/\s/g, '');

/** Whole-word phrase containment: "freeze dad" is in "magic freeze dad game". */
const containsPhrase = (haystack, needle) =>
  needle.length > 0 && ` ${haystack} `.includes(` ${needle} `);

/** A searchable text field: its tokens in order, and as a set for lookups. */
function field(text) {
  // A title made only of stopwords ("The Show") keeps them, or it could never match.
  let tokens = tokenize(text);
  const stopwordsOnly = tokens.length === 0;
  if (stopwordsOnly) tokens = tokenize(text, { keepStopwords: true });
  tokens = [...new Set(tokens)];
  return {
    text,
    phrase: tokens.join(' '),
    compact: compact(text),
    tokens,
    set: new Set(tokens),
    stopwordsOnly,
  };
}

function tokenSet(values) {
  const set = new Set();
  for (const value of values) for (const token of tokenize(value)) set.add(token);
  return set;
}

function buildEntry(episode) {
  const show = SHOWS[episode.show];
  const showTokens = tokenSet([show?.name ?? '', ...(show?.keywords ?? [])]);
  // Show words a parent may say before the real description: the show's name
  // ("bluey...") and its keywords ("the dog..."), except a keyword that names a
  // character of this episode ("george" for Peppa Pig's George).
  const characterTokens = tokenSet(episode.characters ?? []);
  const showWords = tokenSet([show?.name ?? '']);
  for (const token of showTokens) if (!characterTokens.has(token)) showWords.add(token);
  return {
    episode,
    showTokens,
    showWords,
    title: field(episode.title),
    aliases: [episode.title, ...(episode.aliases ?? [])].map(field),
    songs: (episode.songs ?? []).map((song) => field(song.title)),
    characters: (episode.characters ?? []).map(field),
    objects: tokenSet(episode.objects ?? []),
    themes: tokenSet(episode.themes ?? []),
    settings: tokenSet(episode.settings ?? []),
    description: tokenSet([episode.shortDescription ?? '', episode.fullSynopsis ?? '']),
    texts: [
      episode.title,
      ...(episode.aliases ?? []),
      ...(episode.songs ?? []).map((song) => song.title),
      ...(episode.characters ?? []),
      ...(episode.objects ?? []),
      ...(episode.themes ?? []),
      ...(episode.settings ?? []),
      episode.shortDescription ?? '',
      episode.fullSynopsis ?? '',
    ],
  };
}

let INDEX = null;
function getIndex() {
  if (INDEX) return INDEX;
  const entries = EPISODES.map(buildEntry);
  // Every word the catalog uses anywhere, the words it really knows (aliases
  // are left out: they deliberately hold misspellings and toddler-speak), how
  // many episodes use each word, and the words bucketed by length so fuzzy
  // lookups only compare words that could be within typo tolerance.
  const vocabulary = new Set();
  const known = new Set();
  const documentFrequency = new Map();
  // Spellings as they appear in the catalog, before synonyms and stemming, so
  // a typo of "grannies" can still find "nana".
  const surface = new Map();
  for (const entry of entries) {
    for (const text of entry.texts) {
      for (const raw of normalizeText(text).split(' ')) {
        if (!raw || STOPWORDS.has(raw) || surface.has(raw)) continue;
        const canonical = canonicalToken(raw);
        if (!canonical.includes(' ')) surface.set(raw, canonical);
      }
    }
    const curated = [
      entry.showTokens,
      entry.title.set,
      ...entry.songs.map((f) => f.set),
      ...entry.characters.map((f) => f.set),
      entry.objects,
      entry.themes,
      entry.settings,
      entry.description,
    ];
    const inEntry = new Set();
    for (const set of curated) for (const token of set) known.add(token) && inEntry.add(token);
    for (const alias of entry.aliases) for (const token of alias.set) inEntry.add(token);
    for (const token of inEntry) {
      vocabulary.add(token);
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  const bucket = (words) => {
    const byLength = new Map();
    for (const word of words) {
      if (!byLength.has(word.length)) byLength.set(word.length, []);
      byLength.get(word.length).push(word);
    }
    return byLength;
  };
  const typicalIdf = Math.log((entries.length + 1) / (RARITY.typicalDocuments + 1));
  const rarity = (word) => {
    const idf = Math.log((entries.length + 1) / ((documentFrequency.get(word) ?? 0) + 1));
    return Math.min(RARITY.max, Math.max(RARITY.min, idf / typicalIdf));
  };
  INDEX = {
    entries,
    vocabulary,
    known,
    documentFrequency,
    rarity,
    byLength: bucket(vocabulary),
    surface,
    surfaceByLength: bucket(surface.keys()),
  };
  return INDEX;
}

/**
 * Resolve one query token against the catalog vocabulary once, instead of
 * fuzzy-comparing it with every field of every episode. The result maps each
 * catalog word it can stand for to a match quality (1 = exact or a typo of a
 * word the catalog does not know; less for a near-miss of a known word).
 */
function resolveTerm(token, raw, index) {
  const known = index.known.has(token);
  const { vocabulary, byLength } = index;
  const variants = new Map();
  const offer = (word, quality) => {
    if (word !== token && (variants.get(word) ?? 0) < quality) variants.set(word, quality);
  };
  if (vocabulary.has(token)) variants.set(token, 1);
  // Numbers ("5411", "123") are only ever themselves.
  if (/\d/.test(token))
    return { token, known, variants, rarity: index.rarity(token) || RARITY.max };
  const fuzzyQuality = known ? QUALITY.knownFuzzy : QUALITY.typo;
  for (let length = token.length - 2; length <= token.length + 2; length += 1) {
    for (const word of byLength.get(length) ?? []) {
      if (fuzzyEquals(token, word)) offer(word, fuzzyQuality);
    }
  }
  if (!known) {
    // A typo of a spelling the catalog rewrites ("garnnies" for grannies, which
    // becomes "nana") is only visible against the surface spelling.
    for (let length = raw.length - 2; length <= raw.length + 2; length += 1) {
      for (const word of index.surfaceByLength.get(length) ?? []) {
        if (word !== raw && fuzzyEquals(raw, word)) {
          const canonical = index.surface.get(word);
          if (vocabulary.has(canonical)) offer(canonical, QUALITY.typo);
        }
      }
    }
    // Toddler sounds: "wabbit" → rabbit, "toof" → tooth. One substitution at a time.
    for (const [said, meant] of TODDLER_SOUNDS) {
      for (let at = token.indexOf(said); at !== -1; at = token.indexOf(said, at + 1)) {
        const word = canonicalToken(token.slice(0, at) + meant + token.slice(at + said.length));
        if (!word.includes(' ') && vocabulary.has(word)) offer(word, QUALITY.toddlerSound);
      }
    }
    // Clipped words: "puter" → computer, "hippo" → hippopotamus.
    if (token.length >= 4) {
      for (let length = token.length + 2; length <= token.length + 5; length += 1) {
        for (const word of byLength.get(length) ?? []) {
          if (word.endsWith(token) || word.startsWith(token)) offer(word, QUALITY.clipped);
        }
      }
    }
  }
  // A word's rarity, or for a word the catalog has never seen, that of its likeliest reading.
  let rarity = index.documentFrequency.has(token) ? index.rarity(token) : 0;
  if (rarity === 0) {
    for (const word of variants.keys()) rarity = Math.max(rarity, index.rarity(word));
    if (rarity === 0) rarity = RARITY.max;
  }
  return { token, known, variants, rarity };
}

/**
 * Was this character named in the query? The whole name counts, and so does a
 * first name of four or more letters ("daniel" for Daniel Tiger, but not "big"
 * for Big Bird or "dad" for Dad Tiger, which are ordinary words).
 */
function isNamed(phrase, character) {
  if (containsPhrase(phrase, character.phrase)) return true;
  const first = character.tokens[0];
  return character.tokens.length > 1 && first.length >= 4 && containsPhrase(phrase, first);
}

/**
 * Did the terms say the whole field, word for word, allowing other readings
 * ("htoel" for Hotel, "toof fairy" for Tooth Fairy)? Returns the weakest
 * reading's quality, or 0 when the words do not line up one to one.
 */
function wholeMatch(target, terms) {
  if (terms.length === 0 || terms.length !== target.set.size) return 0;
  const used = new Set();
  let weakest = 1;
  let otherReading = false;
  for (const term of terms) {
    let best = 0;
    let bestWord = null;
    for (const [word, quality] of term.variants) {
      if (quality > best && target.set.has(word) && !used.has(word)) {
        best = quality;
        bestWord = word;
      }
    }
    if (best === 0) return 0;
    used.add(bestWord);
    if (bestWord !== term.token) otherReading = true;
    if (best < weakest) weakest = best;
  }
  // The same words in another order are not a typo; the phrase rules handle those.
  return otherReading ? weakest : 0;
}

/** Best match quality of a query term inside a set of field tokens (0 = none). */
function qualityIn(set, term) {
  let best = 0;
  for (const [word, quality] of term.variants) {
    if (quality > best && set.has(word)) {
      best = quality;
      if (best === 1) break;
    }
  }
  return best;
}

function scoreTokenOverlap(terms, fieldSet, maxScore) {
  if (terms.length === 0 || fieldSet.size === 0) return { score: 0, matched: 0 };
  let matched = 0;
  for (const term of terms) matched += qualityIn(fieldSet, term);
  if (matched === 0) return { score: 0, matched: 0 };
  // Reward both how much of the query matched and how much of the field matched.
  const queryCoverage = matched / terms.length;
  const fieldCoverage = Math.min(1, matched / fieldSet.size);
  return { score: Math.round(maxScore * (0.65 * queryCoverage + 0.35 * fieldCoverage)), matched };
}

/**
 * Score a single index entry. Returns { score, matches, coverage } where
 * `coverage` is how much of the query matched somewhere (0–1).
 */
function scoreEntry(entry, query) {
  const { phrase, compactQuery, terms } = query;
  // Parents often name the show first: "bluey dads job", "the dog freezes dad".
  // With the entry's own show words taken out, what is left is compared with
  // titles and aliases too.
  const withoutShow = query.tokens.filter((token) => !entry.showWords.has(token));
  const reducedPhrase =
    withoutShow.length > 0 && withoutShow.length < query.tokens.length ? withoutShow.join(' ') : '';
  const reducedCompact = reducedPhrase ? withoutShow.join('') : '';
  const referenceCompact = query.reference ? compact(query.reference.text) : '';
  const everyWordWithoutShow = query.allTokens.filter((token) => !entry.showWords.has(token));
  const saidExactly = (target) =>
    (Boolean(phrase) &&
      (phrase === target.phrase ||
        compactQuery === target.compact ||
        (reducedPhrase !== '' &&
          (reducedPhrase === target.phrase || reducedCompact === target.compact)))) ||
    (referenceCompact !== '' && referenceCompact === target.compact) ||
    (target.stopwordsOnly && everyWordWithoutShow.join(' ') === target.phrase);
  // Said the whole field with a typo or a toddler sound: worth nearly an exact
  // match (a clipped word, "crick", is too weak a reading for that).
  const reducedTerms = reducedPhrase ? terms.filter((t) => !entry.showWords.has(t.token)) : null;
  const nearlySaid = (target) => {
    const quality =
      wholeMatch(target, terms) || (reducedTerms ? wholeMatch(target, reducedTerms) : 0);
    return quality >= QUALITY.toddlerSound ? quality * NEAR_MATCH : 0;
  };
  let score = 0;
  const matches = [];
  const covered = new Map();
  const cover = (fieldSet) => {
    for (const term of terms) {
      const quality = qualityIn(fieldSet, term);
      if (quality > (covered.get(term.token) ?? 0)) covered.set(term.token, quality);
    }
  };

  // --- Title ---
  const { title } = entry;
  if (
    (phrase && (phrase === title.phrase || (reducedPhrase && reducedPhrase === title.phrase))) ||
    (title.stopwordsOnly && saidExactly(title))
  ) {
    score += WEIGHTS.titleExact;
    matches.push({ field: 'title', text: title.text });
    cover(title.set);
  } else if (saidExactly(title)) {
    score += WEIGHTS.titleCompact;
    matches.push({ field: 'title', text: title.text });
    cover(title.set);
  } else if (nearlySaid(title)) {
    score += Math.round(WEIGHTS.titleExact * nearlySaid(title));
    matches.push({ field: 'title', text: title.text });
    cover(title.set);
  } else if (phrase.length > 2 && containsPhrase(title.phrase, phrase)) {
    score += WEIGHTS.titlePhrase;
    matches.push({ field: 'title', text: title.text });
    cover(title.set);
  } else if (title.tokens.length > 1 && containsPhrase(phrase, title.phrase)) {
    // A whole multi-word title was said inside a longer query: "bluey duck cake" → Duck Cake.
    // (A one-word title is just a word; it scores as a token below.)
    score += WEIGHTS.titleContained;
    matches.push({ field: 'title', text: title.text });
    cover(title.set);
  } else {
    let titleScore = 0;
    for (const term of terms) {
      if (title.set.has(term.token)) titleScore += WEIGHTS.titleToken;
      else {
        const quality = qualityIn(title.set, term);
        if (quality > 0) titleScore += Math.round(WEIGHTS.titleFuzzyToken * quality);
      }
    }
    if (titleScore > 0) {
      score += Math.min(titleScore, WEIGHTS.titlePhrase - 10);
      matches.push({ field: 'title', text: title.text });
      cover(title.set);
    }
  }

  // --- Aliases (take the best one, plus a little for breadth) ---
  let bestAlias = 0;
  let bestAliasText = null;
  let aliasHits = 0;
  for (const alias of entry.aliases) {
    let aliasScore = 0;
    if (saidExactly(alias)) {
      aliasScore = WEIGHTS.aliasExact;
    } else if (nearlySaid(alias)) {
      aliasScore = Math.round(WEIGHTS.aliasExact * nearlySaid(alias));
    } else if (
      phrase.length > 3 &&
      alias.phrase.length > 3 &&
      (containsPhrase(alias.phrase, phrase) || containsPhrase(phrase, alias.phrase))
    ) {
      aliasScore = WEIGHTS.aliasPhrase;
    } else {
      aliasScore = scoreTokenOverlap(terms, alias.set, WEIGHTS.aliasTokenMax).score;
    }
    if (aliasScore > 0) {
      aliasHits += 1;
      cover(alias.set);
      if (aliasScore > bestAlias) {
        bestAlias = aliasScore;
        bestAliasText = alias.text;
      }
    }
  }
  if (bestAlias > 0) {
    score += bestAlias + Math.min(aliasHits - 1, 4) * 3;
    // The title doubles as an alias; report it once.
    if (bestAliasText !== title.text || !matches.some((m) => m.field === 'title')) {
      matches.push({ field: 'alias', text: bestAliasText });
    }
  }

  // --- Songs ---
  let bestSong = 0;
  let bestSongText = null;
  for (const song of entry.songs) {
    let songScore = 0;
    if (saidExactly(song)) {
      songScore = WEIGHTS.songExact;
    } else if (nearlySaid(song)) {
      songScore = Math.round(WEIGHTS.songExact * nearlySaid(song));
    } else if (phrase.length > 3 && containsPhrase(song.phrase, phrase)) {
      songScore = WEIGHTS.songPhrase;
    } else if (song.phrase.length > 3 && containsPhrase(phrase, song.phrase)) {
      songScore = WEIGHTS.songPhrase - 20;
    } else {
      songScore = scoreTokenOverlap(terms, song.set, WEIGHTS.songTokenMax).score;
    }
    if (songScore > 0) {
      cover(song.set);
      if (songScore > bestSong) {
        bestSong = songScore;
        bestSongText = song.text;
      }
    }
  }
  if (bestSong > 0) {
    score += bestSong;
    matches.push({ field: 'song', text: bestSongText });
  }

  // --- Characters ---
  let characterScore = 0;
  for (const character of entry.characters) {
    // The name was said: "bandit", "cookie monster", or just "george" for George Pig.
    if (phrase && character.phrase && isNamed(phrase, character)) {
      characterScore += WEIGHTS.characterExact;
      cover(character.set);
      matches.push({ field: 'character', text: character.text });
      continue;
    }
    const overlap = scoreTokenOverlap(terms, character.set, WEIGHTS.characterToken);
    if (overlap.matched > 0) {
      characterScore += overlap.score;
      cover(character.set);
      matches.push({ field: 'character', text: character.text });
    }
  }
  score += Math.min(characterScore, WEIGHTS.characterExact + WEIGHTS.characterToken);

  // --- Objects / themes / settings / description ---
  const bag = (set, weight, cap, fieldName, byRarity = false) => {
    let total = 0;
    let first = null;
    for (const term of terms) {
      const quality = qualityIn(set, term);
      if (quality > 0) {
        total += weight * quality * (byRarity ? term.rarity : 1);
        if (quality > (covered.get(term.token) ?? 0)) covered.set(term.token, quality);
        if (!first) first = term.token;
      }
    }
    if (total > 0) {
      score += Math.round(Math.min(total, cap));
      if (fieldName) matches.push({ field: fieldName, text: first });
    }
  };
  bag(entry.showTokens, WEIGHTS.showToken, WEIGHTS.showToken * 2, null);
  bag(entry.objects, WEIGHTS.objectToken, WEIGHTS.objectToken * 2, 'object', true);
  bag(entry.themes, WEIGHTS.themeToken, WEIGHTS.themeToken * 2, 'theme');
  bag(entry.settings, WEIGHTS.settingToken, WEIGHTS.settingToken * 2, 'setting');
  bag(entry.description, WEIGHTS.descriptionToken, WEIGHTS.descriptionToken * 8, null, true);

  // --- Season / episode reference ("bluey s2e5") ---
  if (query.reference) {
    const { season, number, segment } = query.reference;
    const { episode } = entry;
    if (
      (season === null || episode.season === season) &&
      (number === null || episode.episode === number) &&
      (!segment || (episode.segment ?? '').toUpperCase() === segment)
    ) {
      score += number === null ? WEIGHTS.seasonReference : WEIGHTS.episodeReference;
      matches.push({ field: 'episode', text: query.reference.text });
    }
  }

  // --- Coverage: reward queries whose words all matched somewhere, and
  // shrink results that only matched some of what the parent said. Missing a
  // rare word ("drainpipe") costs more than missing a common one ("bluey").
  let coverage = 0;
  if (terms.length > 0) {
    let sum = 0;
    let weight = 0;
    for (const term of terms) {
      sum += (covered.get(term.token) ?? 0) * term.rarity;
      weight += term.rarity;
    }
    coverage = sum / weight;
  }
  if (terms.length > 0 && (terms.length > 1 || query.reference) && score > 0) {
    if (coverage >= 1) score += WEIGHTS.fullCoverageBonus;
    else score = Math.round(score * (COVERAGE_FLOOR + (1 - COVERAGE_FLOOR) * coverage));
  }

  return { score, matches, coverage };
}

/** Pull a season/episode reference out of the query; returns it and the query without it. */
function parseReference(normalized) {
  let season = null;
  let number = null;
  let segment = null;
  const texts = [];
  for (const pattern of REFERENCE_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match) continue;
    season = Number(match[1]);
    number = Number(match[2]);
    segment = match[3]?.toUpperCase() ?? null;
    texts.push(match[0]);
    break;
  }
  if (texts.length === 0) {
    const seasonMatch = normalized.match(SEASON_PATTERN);
    const episodeMatch = normalized.match(EPISODE_PATTERN);
    if (seasonMatch) {
      season = Number(seasonMatch[1]);
      texts.push(seasonMatch[0]);
    }
    if (episodeMatch) {
      number = Number(episodeMatch[1]);
      segment = episodeMatch[2]?.toUpperCase() ?? null;
      texts.push(episodeMatch[0]);
    }
  }
  if (texts.length === 0) return { reference: null, rest: normalized };
  let rest = normalized;
  for (const text of texts) rest = rest.replace(text, ' ');
  return { reference: { season, number, segment, text: texts.join(' ') }, rest };
}

/** Tokens of a query with the spelling each one came from ("doggy" behind "dog"). */
function tokensWithSpelling(text, { keepStopwords = false } = {}) {
  const tokens = [];
  const spelling = new Map();
  for (const raw of normalizeText(text).split(' ')) {
    if (!raw || (!keepStopwords && STOPWORDS.has(raw))) continue;
    for (const part of canonicalToken(raw).split(' ')) {
      if (!part || (!keepStopwords && STOPWORDS.has(part)) || spelling.has(part)) continue;
      tokens.push(part);
      spelling.set(part, raw);
    }
  }
  return { tokens, spelling };
}

function parseQuery(rawQuery, index) {
  const { reference, rest } = parseReference(normalizeText(rawQuery));
  let parsed = tokensWithSpelling(rest);
  if (parsed.tokens.length === 0 && !reference)
    parsed = tokensWithSpelling(rest, { keepStopwords: true });
  const { tokens, spelling } = parsed;
  return {
    raw: rawQuery,
    reference,
    phrase: tokens.join(' '),
    compactQuery: compact(rest),
    tokens,
    // Every word including stopwords, for titles that are nothing but ("The Show").
    allTokens: tokensWithSpelling(rest, { keepStopwords: true }).tokens,
    terms: tokens.map((token) => resolveTerm(token, spelling.get(token) ?? token, index)),
  };
}

/**
 * Search the catalog.
 *
 * @param {string} rawQuery  What the parent typed or said.
 * @param {object} [options]
 * @param {number} [options.limit=20]
 * @param {string} [options.show]       Restrict to a show id.
 * @param {string} [options.character]  Require this character.
 * @param {string} [options.setting]    Require this setting.
 * @returns {Array<{episode: object, score: number, matches: Array<{field: string, text: string}>, coverage: number}>}
 *   `matches[].field` is one of title, alias, song, character, object, theme, setting, episode.
 */
export function searchEpisodes(rawQuery, options = {}) {
  const { limit = 20, show, character, setting } = options;
  if (!rawQuery || !rawQuery.trim()) return [];
  const index = getIndex();
  const query = parseQuery(rawQuery, index);
  if (query.tokens.length === 0 && !query.reference) return [];

  const results = [];
  for (const entry of index.entries) {
    const { episode } = entry;
    if (show && episode.show !== show) continue;
    if (character && !(episode.characters ?? []).includes(character)) continue;
    if (setting && !(episode.settings ?? []).includes(setting)) continue;
    const scored = scoreEntry(entry, query);
    if (scored.score > 0) results.push({ episode, ...scored });
  }

  results.sort(
    (a, b) =>
      b.score - a.score || b.coverage - a.coverage || a.episode.title.localeCompare(b.episode.title)
  );
  return results.slice(0, limit);
}

/**
 * Suggest clarifying questions when the top results are close together.
 * Returns up to two questions, each with options and a "Not sure" escape.
 * (Options carry no emoji: the brand's UI renders them as plain text links.)
 */
export function generateFollowUps(results) {
  if (!results || results.length < 2) return [];
  const top = results.slice(0, 5);
  // Only ask when the top result is not a clear winner.
  if (top[0].score >= top[1].score * 1.35) return [];

  const questions = [];
  const showIds = [...new Set(top.map((r) => r.episode.show))];
  if (showIds.length > 1) {
    questions.push({
      type: 'show',
      text: 'Which show?',
      options: showIds.map((id) => ({ label: SHOWS[id]?.name ?? id, value: id })),
    });
  }

  const countBy = (fieldName) => {
    const counts = {};
    for (const r of top)
      for (const value of r.episode[fieldName] ?? []) counts[value] = (counts[value] ?? 0) + 1;
    return Object.entries(counts)
      .filter(([, count]) => count >= 2 && count < top.length)
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => value)
      .slice(0, 4);
  };

  const characters = countBy('characters');
  if (characters.length >= 2 && questions.length < 2) {
    questions.push({
      type: 'character',
      text: 'Who was in it?',
      options: characters.map((name) => ({ label: name, value: name })),
    });
  }

  const settings = countBy('settings');
  if (settings.length >= 2 && questions.length < 2) {
    questions.push({
      type: 'setting',
      text: 'Where did it happen?',
      options: settings.map((name) => ({ label: name, value: name })),
    });
  }

  for (const question of questions) {
    question.options.push({ label: 'Not sure', value: null });
  }
  return questions.slice(0, 2);
}

/** Episodes similar to the given one: same show, shared characters/themes/settings. */
export function getRelatedEpisodes(episode, limit = 6) {
  if (!episode) return [];
  const characters = new Set(episode.characters ?? []);
  const themes = new Set(episode.themes ?? []);
  const settings = new Set(episode.settings ?? []);
  return EPISODES.filter((candidate) => candidate.id !== episode.id)
    .map((candidate) => {
      let score = candidate.show === episode.show ? 30 : 0;
      for (const c of candidate.characters ?? []) if (characters.has(c)) score += 12;
      for (const t of candidate.themes ?? []) if (themes.has(t)) score += 10;
      for (const s of candidate.settings ?? []) if (settings.has(s)) score += 6;
      if (
        candidate.show === episode.show &&
        Math.abs((candidate.season ?? 0) - (episode.season ?? 0)) === 0
      ) {
        score += 3;
      }
      return { episode: candidate, score };
    })
    .filter((item) => item.score > 30)
    .sort((a, b) => b.score - a.score || a.episode.title.localeCompare(b.episode.title))
    .slice(0, limit)
    .map((item) => item.episode);
}

/** Raw query tokens (canonical + original spelling) for highlighting. */
export function getHighlightTerms(rawQuery) {
  if (!rawQuery) return [];
  const original = normalizeText(rawQuery)
    .split(' ')
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
  return [...new Set([...original, ...tokenize(rawQuery)])].filter((t) => t.length >= 3);
}
