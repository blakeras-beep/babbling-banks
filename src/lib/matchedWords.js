import { canonicalToken, fuzzyEquals, normalizeText, tokenize, STOPWORDS } from './text.js';

/**
 * Which of the kid's words earned the lemon swipe: query words (in the order
 * they were said) whose canonical token appears in what the top result matched
 * on. Max three; nothing when nothing matched.
 */
export function getMatchedWords(query, result, max = 3) {
  if (!query || !result?.episode) return [];
  const { episode } = result;
  const haystack = new Set();
  for (const match of result.matches ?? []) for (const t of tokenize(match.text)) haystack.add(t);
  for (const t of tokenize(episode.title)) haystack.add(t);
  for (const song of episode.songs ?? []) for (const t of tokenize(song.title)) haystack.add(t);
  for (const name of episode.characters ?? []) for (const t of tokenize(name)) haystack.add(t);

  const found = [];
  for (const word of normalizeText(query).split(' ')) {
    if (!word || STOPWORDS.has(word) || found.includes(word)) continue;
    const parts = canonicalToken(word).split(' ');
    const hit = parts.some((part) => {
      if (haystack.has(part)) return true;
      for (const token of haystack) if (fuzzyEquals(part, token)) return true;
      return false;
    });
    if (hit) found.push(word);
    if (found.length >= max) break;
  }
  return found;
}

/** Does this spoken word (with its punctuation) belong to the matched set? */
export function isMatchedWord(word, matched) {
  const clean = normalizeText(word);
  return clean.length > 0 && matched.includes(clean);
}
