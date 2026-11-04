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
import { tokenize, fuzzyEquals, normalizeText, STOPWORDS } from './text.js';

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
};

/**
 * What a typo-tolerant match is worth when the catalog already knows the
 * query word exactly. "bluey" is a real word in the catalog, so an entry that
 * only has "blue" probably is not what the parent meant; "xilaphone" is not,
 * so its fuzzy match on "xylophone" is the best reading and earns full credit.
 */
const KNOWN_FUZZY_QUALITY = 0.4;

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
  if (tokens.length === 0) tokens = tokenize(text, { keepStopwords: true });
  return { text, phrase: tokens.join(' '), compact: compact(text), tokens, set: new Set(tokens) };
}

function tokenSet(values) {
  const set = new Set();
  for (const value of values) for (const token of tokenize(value)) set.add(token);
  return set;
}

function buildEntry(episode) {
  const show = SHOWS[episode.show];
  return {
    episode,
    showTokens: tokenSet([show?.name ?? '', ...(show?.keywords ?? [])]),
    showName: tokenSet([show?.name ?? '']),
    title: field(episode.title),
    aliases: (episode.aliases ?? []).map(field),
    songs: (episode.songs ?? []).map((song) => field(song.title)),
    characters: (episode.characters ?? []).map(field),
    objects: tokenSet(episode.objects ?? []),
    themes: tokenSet(episode.themes ?? []),
    settings: tokenSet(episode.settings ?? []),
    description: tokenSet([episode.shortDescription ?? '', episode.fullSynopsis ?? '']),
  };
}

let INDEX = null;
function getIndex() {
  if (INDEX) return INDEX;
  const entries = EPISODES.map(buildEntry);
  // Every word the catalog knows, bucketed by length so fuzzy lookups only
  // compare words that could be within typo tolerance.
  const vocabulary = new Set();
  for (const entry of entries) {
    const sets = [
      entry.showTokens,
      entry.title.set,
      ...entry.aliases.map((f) => f.set),
      ...entry.songs.map((f) => f.set),
      ...entry.characters.map((f) => f.set),
      entry.objects,
      entry.themes,
      entry.settings,
      entry.description,
    ];
    for (const set of sets) for (const token of set) vocabulary.add(token);
  }
  const byLength = new Map();
  for (const word of vocabulary) {
    if (!byLength.has(word.length)) byLength.set(word.length, []);
    byLength.get(word.length).push(word);
  }
  INDEX = { entries, vocabulary, byLength };
  return INDEX;
}

/**
 * Resolve one query token against the catalog vocabulary once, instead of
 * fuzzy-comparing it with every field of every episode. The result maps each
 * catalog word it can stand for to a match quality (1 = exact or a typo of a
 * word the catalog does not know; less for a near-miss of a known word).
 */
function resolveTerm(token, { vocabulary, byLength }) {
  const known = vocabulary.has(token);
  const variants = new Map();
  if (known) variants.set(token, 1);
  const fuzzyQuality = known ? KNOWN_FUZZY_QUALITY : 1;
  for (let length = token.length - 2; length <= token.length + 2; length += 1) {
    for (const word of byLength.get(length) ?? []) {
      if (word !== token && fuzzyEquals(token, word)) variants.set(word, fuzzyQuality);
    }
  }
  return { token, known, variants };
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
  // Parents often name the show first: "bluey dads job". With the entry's own
  // show name taken out, what is left is compared with titles and aliases too.
  const withoutShow = query.tokens.filter((token) => !entry.showName.has(token));
  const reducedPhrase =
    withoutShow.length > 0 && withoutShow.length < query.tokens.length ? withoutShow.join(' ') : '';
  const reducedCompact = reducedPhrase ? withoutShow.join('') : '';
  const saidExactly = (target) =>
    Boolean(phrase) &&
    (phrase === target.phrase ||
      compactQuery === target.compact ||
      (reducedPhrase !== '' &&
        (reducedPhrase === target.phrase || reducedCompact === target.compact)));
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
  if (phrase && (phrase === title.phrase || (reducedPhrase && reducedPhrase === title.phrase))) {
    score += WEIGHTS.titleExact;
    matches.push({ field: 'title', text: title.text });
    cover(title.set);
  } else if (saidExactly(title)) {
    score += WEIGHTS.titleCompact;
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
    matches.push({ field: 'alias', text: bestAliasText });
  }

  // --- Songs ---
  let bestSong = 0;
  let bestSongText = null;
  for (const song of entry.songs) {
    let songScore = 0;
    if (saidExactly(song)) {
      songScore = WEIGHTS.songExact;
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
  const bag = (set, weight, cap, fieldName) => {
    let total = 0;
    let first = null;
    for (const term of terms) {
      const quality = qualityIn(set, term);
      if (quality > 0) {
        total += weight * quality;
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
  bag(entry.objects, WEIGHTS.objectToken, WEIGHTS.objectToken * 2, 'object');
  bag(entry.themes, WEIGHTS.themeToken, WEIGHTS.themeToken * 2, 'theme');
  bag(entry.settings, WEIGHTS.settingToken, WEIGHTS.settingToken * 2, 'setting');
  bag(entry.description, WEIGHTS.descriptionToken, WEIGHTS.descriptionToken * 5, null);

  // --- Coverage: reward queries whose words all matched somewhere, and
  // shrink results that only matched some of what the parent said.
  let coverage = 0;
  if (terms.length > 0) {
    let sum = 0;
    for (const term of terms) sum += covered.get(term.token) ?? 0;
    coverage = sum / terms.length;
  }
  if (terms.length > 1 && score > 0) {
    if (coverage >= 1) score += WEIGHTS.fullCoverageBonus;
    else score = Math.round(score * (COVERAGE_FLOOR + (1 - COVERAGE_FLOOR) * coverage));
  }

  return { score, matches, coverage };
}

function parseQuery(rawQuery, index) {
  let tokens = tokenize(rawQuery);
  if (tokens.length === 0) tokens = tokenize(rawQuery, { keepStopwords: true });
  tokens = [...new Set(tokens)];
  return {
    raw: rawQuery,
    phrase: tokens.join(' '),
    compactQuery: compact(rawQuery),
    tokens,
    terms: tokens.map((token) => resolveTerm(token, index)),
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
 */
export function searchEpisodes(rawQuery, options = {}) {
  const { limit = 20, show, character, setting } = options;
  if (!rawQuery || !rawQuery.trim()) return [];
  const index = getIndex();
  const query = parseQuery(rawQuery, index);
  if (query.tokens.length === 0) return [];

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
