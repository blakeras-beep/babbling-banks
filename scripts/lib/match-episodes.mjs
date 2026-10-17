/**
 * Pure matching between our catalog's episodes and a TMDB season listing.
 * Kept free of network and file access so it can be unit tested.
 */

const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** "wagon ride" and "wagonride" are the same title. */
const compact = (text) => text.replace(/ /g, '');

/** Split a TMDB episode name like "Kite / Bath Time" into its segment titles. */
export function splitTitles(name) {
  return (
    String(name ?? '')
      // Sesame Street appends production numbers: "Granny Bird Visits (0030)".
      .replace(/\s*\(\d{3,}\)\s*$/, '')
      .split(/\s*(?:\/|;|\|)\s*/)
      .map(normalize)
      .filter(Boolean)
  );
}

/** Dice coefficient over letter pairs, 0..1. Catches "Zeros"/"Zeroes", "Sitters"/"Sisters". */
export function similarity(a, b) {
  const pairs = (text) => {
    const s = compact(text);
    const list = [];
    for (let i = 0; i < s.length - 1; i += 1) list.push(s.slice(i, i + 2));
    return list;
  };
  const left = pairs(a);
  const right = pairs(b);
  if (left.length === 0 || right.length === 0) return 0;
  const pool = [...right];
  let shared = 0;
  for (const pair of left) {
    const index = pool.indexOf(pair);
    if (index !== -1) {
      shared += 1;
      pool.splice(index, 1);
    }
  }
  return (2 * shared) / (left.length + right.length);
}

const FUZZY_THRESHOLD = 0.8;

/** Small words that differ between listings ("Calm for Storytime" / "Calm Before Story Time"). */
const FILLER = new Set([
  'a',
  'an',
  'the',
  'and',
  'of',
  'for',
  'before',
  'to',
  'at',
  'in',
  'on',
  'with',
]);
const core = (text) =>
  text
    .split(' ')
    .filter((word) => !FILLER.has(word))
    .join('');

const digits = (text) => text.match(/\d+/g)?.join(' ') ?? '';

/** Near-identical titles: same core words, or close spelling with the same numbers. */
function closeTitle(a, b) {
  if (digits(a) !== digits(b)) return 0;
  if (core(a) && core(a) === core(b)) return 1;
  return similarity(a, b);
}

/**
 * Does TMDB number two-story episodes separately in this season? We say yes
 * when the TMDB season lists about twice as many episodes as our highest
 * episode number, which is how TMDB handles many preschool shows.
 */
export function usesDoubledNumbering(tmdbEpisodes, ourEpisodes) {
  const segmented = ourEpisodes.filter((e) => e.segment);
  if (segmented.length === 0) return false;
  const maxNumber = Math.max(...ourEpisodes.map((e) => e.episode));
  return tmdbEpisodes.length >= Math.round(maxNumber * 1.8);
}

const sameTitle = (title) => (segment) => segment === title || compact(segment) === compact(title);

/** Exact (or space-insensitive) title match against one segment of a TMDB name. */
function findByTitle(title, tmdbEpisodes) {
  return tmdbEpisodes.find((t) => splitTitles(t.name).some(sameTitle(title)));
}

/**
 * Find the TMDB episode for one of ours. In order:
 *  1. exact title in this season (survives numbering differences),
 *  2. our title inside a longer TMDB name in this season,
 *  3. exact title in another season or the specials (`elsewhere`), for
 *     episodes TMDB files under a different season,
 *  4. a near-identical title in this season (spelling variants, filler
 *     words), skipping TMDB titles another of our episodes matches exactly
 *     (`taken`) so "Parade" never lands on "Parrot",
 *  5. the episode number, doubled for segments when TMDB numbers them
 *     separately. A number hit is refused when that TMDB episode already
 *     belongs, by title, to a different episode of ours (`claims`).
 * @returns {{ episode: object, how: 'title'|'elsewhere'|'fuzzy'|'number' } | null}
 */
export function matchEpisode(
  ours,
  tmdbEpisodes,
  { doubled = false, elsewhere = [], claims = new Map(), taken = new Set() } = {}
) {
  const title = normalize(ours.title);
  if (title) {
    const byTitle = findByTitle(title, tmdbEpisodes);
    if (byTitle) return { episode: byTitle, how: 'title' };
    // Our title inside a longer TMDB name ("Magic Xylophone (Part 1)").
    const loose = tmdbEpisodes.find((t) => normalize(t.name).includes(title) && title.length >= 8);
    if (loose) return { episode: loose, how: 'title' };
    const moved = findByTitle(title, elsewhere);
    if (moved) return { episode: moved, how: 'elsewhere' };
    let best = null;
    for (const t of tmdbEpisodes) {
      for (const segment of splitTitles(t.name)) {
        if (taken.has(compact(segment))) continue;
        const score = closeTitle(title, segment);
        if (score >= FUZZY_THRESHOLD && (!best || score > best.score)) best = { t, score };
      }
    }
    if (best) return { episode: best.t, how: 'fuzzy' };
  }
  let number = ours.episode;
  if (doubled && ours.segment) {
    const offset = ours.segment.toUpperCase() === 'A' ? -1 : 0;
    number = ours.episode * 2 + offset;
  }
  const byNumber = tmdbEpisodes.find((t) => t.episode_number === number);
  if (!byNumber) return null;
  const owners = claims.get(byNumber.episode_number);
  if (owners && !owners.has(ours.episode)) return null;
  return { episode: byNumber, how: 'number' };
}

/**
 * Match every episode of a season. `elsewhere` is every other TMDB season of
 * the show (specials included), searched by exact title only. Returns one
 * entry per episode id: { id, still, how } where still is the TMDB still
 * path or null.
 */
export function matchSeason(ourEpisodes, tmdbEpisodes, elsewhere = []) {
  const doubled = usesDoubledNumbering(tmdbEpisodes, ourEpisodes);
  // Which of our episode numbers each TMDB episode belongs to by exact title.
  const claims = new Map();
  const taken = new Set();
  for (const ours of ourEpisodes) {
    const title = normalize(ours.title);
    const hit = findByTitle(title, tmdbEpisodes);
    if (!hit) continue;
    taken.add(compact(title));
    if (!claims.has(hit.episode_number)) claims.set(hit.episode_number, new Set());
    claims.get(hit.episode_number).add(ours.episode);
  }
  return ourEpisodes.map((ours) => {
    const match = matchEpisode(ours, tmdbEpisodes, { doubled, elsewhere, claims, taken });
    return {
      id: ours.id,
      still: match?.episode?.still_path ?? null,
      how: match ? match.how : 'none',
    };
  });
}
