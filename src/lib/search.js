/**
 * Babbling Banks search engine.
 *
 * Pure functions over the episode catalog. The engine builds a small index
 * once (canonicalised tokens for every searchable field) and scores each
 * episode against the query with a mix of phrase matches, fuzzy token matches
 * and a coverage bonus so multi-word descriptions rank sensibly.
 *
 * Nothing in here touches the DOM, so it is unit-tested directly.
 */
import { EPISODES, SHOWS } from '../data/index.js';
import { tokenize, canonicalPhrase, fuzzyEquals, normalizeText, STOPWORDS } from './text.js';

const WEIGHTS = {
  titleExact: 200,
  titleCompact: 190,
  titlePhrase: 110,
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

const compact = (text) => normalizeText(text).replace(/\s/g, '');

/** Whole-word phrase containment: "freeze dad" is in "magic freeze dad game". */
const containsPhrase = (haystack, needle) =>
  needle.length > 0 && ` ${haystack} `.includes(` ${needle} `);

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
    titlePhrase: canonicalPhrase(episode.title),
    titleCompact: compact(episode.title),
    titleTokens: tokenize(episode.title),
    aliases: (episode.aliases ?? []).map((alias) => ({
      text: alias,
      phrase: canonicalPhrase(alias),
      compact: compact(alias),
      tokens: tokenize(alias),
    })),
    songs: (episode.songs ?? []).map((song) => ({
      text: song.title,
      phrase: canonicalPhrase(song.title),
      compact: compact(song.title),
      tokens: tokenize(song.title),
    })),
    characters: (episode.characters ?? []).map((name) => ({
      text: name,
      phrase: canonicalPhrase(name),
      tokens: tokenize(name),
    })),
    objects: tokenSet(episode.objects ?? []),
    themes: tokenSet(episode.themes ?? []),
    settings: tokenSet(episode.settings ?? []),
    description: tokenSet([episode.shortDescription ?? '', episode.fullSynopsis ?? '']),
  };
}

let INDEX = null;
function getIndex() {
  if (!INDEX) INDEX = EPISODES.map(buildEntry);
  return INDEX;
}

/** Does any token in `tokens` fuzzily match `token`? */
function hasFuzzy(tokens, token) {
  for (const candidate of tokens) if (fuzzyEquals(candidate, token)) return true;
  return false;
}

function scoreTokenOverlap(queryTokens, fieldTokens, maxScore) {
  if (queryTokens.length === 0 || fieldTokens.length === 0) return { score: 0, matched: 0 };
  let matched = 0;
  for (const token of queryTokens) if (hasFuzzy(fieldTokens, token)) matched += 1;
  if (matched === 0) return { score: 0, matched: 0 };
  // Reward both how much of the query matched and how much of the field matched.
  const queryCoverage = matched / queryTokens.length;
  const fieldCoverage = matched / fieldTokens.length;
  return { score: Math.round(maxScore * (0.65 * queryCoverage + 0.35 * fieldCoverage)), matched };
}

/**
 * Score a single index entry. Returns { score, matches, covered } where
 * `covered` is the set of query tokens that matched anywhere.
 */
function scoreEntry(entry, query) {
  const { phrase, compactQuery, tokens } = query;
  let score = 0;
  const matches = [];
  const covered = new Set();
  const cover = (fieldTokens) => {
    for (const token of tokens) if (hasFuzzy(fieldTokens, token)) covered.add(token);
  };

  // --- Title ---
  if (phrase && phrase === entry.titlePhrase) {
    score += WEIGHTS.titleExact;
    matches.push({ field: 'title', text: entry.episode.title });
    cover(entry.titleTokens);
  } else if (compactQuery && compactQuery === entry.titleCompact) {
    score += WEIGHTS.titleCompact;
    matches.push({ field: 'title', text: entry.episode.title });
    cover(entry.titleTokens);
  } else if (phrase.length > 2 && containsPhrase(entry.titlePhrase, phrase)) {
    score += WEIGHTS.titlePhrase;
    matches.push({ field: 'title', text: entry.episode.title });
    cover(entry.titleTokens);
  } else {
    let titleScore = 0;
    for (const token of tokens) {
      if (entry.titleTokens.includes(token)) titleScore += WEIGHTS.titleToken;
      else if (hasFuzzy(entry.titleTokens, token)) titleScore += WEIGHTS.titleFuzzyToken;
    }
    if (titleScore > 0) {
      score += Math.min(titleScore, WEIGHTS.titlePhrase - 10);
      matches.push({ field: 'title', text: entry.episode.title });
      cover(entry.titleTokens);
    }
  }

  // --- Aliases (take the best one, plus a little for breadth) ---
  let bestAlias = 0;
  let bestAliasText = null;
  let aliasHits = 0;
  for (const alias of entry.aliases) {
    let aliasScore = 0;
    if (phrase && (phrase === alias.phrase || compactQuery === alias.compact)) {
      aliasScore = WEIGHTS.aliasExact;
    } else if (
      phrase.length > 3 &&
      alias.phrase.length > 3 &&
      (containsPhrase(alias.phrase, phrase) || containsPhrase(phrase, alias.phrase))
    ) {
      aliasScore = WEIGHTS.aliasPhrase;
    } else {
      aliasScore = scoreTokenOverlap(tokens, alias.tokens, WEIGHTS.aliasTokenMax).score;
    }
    if (aliasScore > 0) {
      aliasHits += 1;
      cover(alias.tokens);
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
    if (phrase && (phrase === song.phrase || compactQuery === song.compact)) {
      songScore = WEIGHTS.songExact;
    } else if (phrase.length > 3 && containsPhrase(song.phrase, phrase)) {
      songScore = WEIGHTS.songPhrase;
    } else if (song.phrase.length > 3 && containsPhrase(phrase, song.phrase)) {
      songScore = WEIGHTS.songPhrase - 20;
    } else {
      songScore = scoreTokenOverlap(tokens, song.tokens, WEIGHTS.songTokenMax).score;
    }
    if (songScore > 0) {
      cover(song.tokens);
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
    if (phrase && phrase === character.phrase) {
      characterScore += WEIGHTS.characterExact;
      cover(character.tokens);
      matches.push({ field: 'character', text: character.text });
      continue;
    }
    const overlap = scoreTokenOverlap(tokens, character.tokens, WEIGHTS.characterToken);
    if (overlap.matched > 0) {
      characterScore += overlap.score;
      cover(character.tokens);
      matches.push({ field: 'character', text: character.text });
    }
  }
  score += Math.min(characterScore, WEIGHTS.characterExact + WEIGHTS.characterToken);

  // --- Objects / themes / settings / description ---
  const bag = (set, weight, cap, field) => {
    let total = 0;
    let first = null;
    for (const token of tokens) {
      if (hasFuzzy(set, token)) {
        total += weight;
        covered.add(token);
        if (!first) first = token;
      }
    }
    if (total > 0) {
      score += Math.min(total, cap);
      if (field) matches.push({ field, text: first });
    }
  };
  bag(entry.showTokens, WEIGHTS.showToken, WEIGHTS.showToken * 2, null);
  bag(entry.objects, WEIGHTS.objectToken, WEIGHTS.objectToken * 2, 'object');
  bag(entry.themes, WEIGHTS.themeToken, WEIGHTS.themeToken * 2, 'theme');
  bag(entry.settings, WEIGHTS.settingToken, WEIGHTS.settingToken * 2, 'setting');
  bag(entry.description, WEIGHTS.descriptionToken, WEIGHTS.descriptionToken * 5, null);

  // --- Coverage: reward queries whose words all matched somewhere, and
  // damp results that only matched a small slice of a long description.
  if (tokens.length > 0 && score > 0) {
    const coverage = covered.size / tokens.length;
    if (coverage === 1 && tokens.length > 1) score += WEIGHTS.fullCoverageBonus;
    else if (coverage < 0.5 && tokens.length >= 3) score = Math.round(score * 0.6);
  }

  return { score, matches, coverage: tokens.length ? covered.size / tokens.length : 0 };
}

function parseQuery(rawQuery) {
  let tokens = tokenize(rawQuery);
  if (tokens.length === 0) tokens = tokenize(rawQuery, { keepStopwords: true });
  tokens = [...new Set(tokens)];
  return {
    raw: rawQuery,
    phrase: tokens.join(' '),
    compactQuery: compact(rawQuery),
    tokens,
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
 * @returns {Array<{episode: object, score: number, matches: Array<{field: string, text: string}>}>}
 */
export function searchEpisodes(rawQuery, options = {}) {
  const { limit = 20, show, character, setting } = options;
  if (!rawQuery || !rawQuery.trim()) return [];
  const query = parseQuery(rawQuery);
  if (query.tokens.length === 0) return [];

  const results = [];
  for (const entry of getIndex()) {
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

  const countBy = (field) => {
    const counts = {};
    for (const r of top)
      for (const value of r.episode[field] ?? []) counts[value] = (counts[value] ?? 0) + 1;
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
