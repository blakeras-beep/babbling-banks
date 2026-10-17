/**
 * Pure matching between our catalog's episodes and a TMDB season listing.
 * Kept free of network and file access so it can be unit tested.
 */

const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Split a TMDB episode name like "Kite / Bath Time" into its segment titles. */
export function splitTitles(name) {
  return String(name ?? '')
    .split(/\s*(?:\/|;|\|)\s*/)
    .map(normalize)
    .filter(Boolean);
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

/**
 * Find the TMDB episode for one of ours. Title match wins (it survives
 * numbering differences); then the episode number, doubled for segments when
 * TMDB numbers them separately.
 * @returns {{ episode: object, how: 'title'|'number' } | null}
 */
export function matchEpisode(ours, tmdbEpisodes, { doubled = false } = {}) {
  const title = normalize(ours.title);
  if (title) {
    const byTitle = tmdbEpisodes.find((t) => splitTitles(t.name).includes(title));
    if (byTitle) return { episode: byTitle, how: 'title' };
    // Our title inside a longer TMDB name ("Magic Xylophone (Part 1)").
    const loose = tmdbEpisodes.find((t) => normalize(t.name).includes(title) && title.length >= 8);
    if (loose) return { episode: loose, how: 'title' };
  }
  let number = ours.episode;
  if (doubled && ours.segment) {
    const offset = ours.segment.toUpperCase() === 'A' ? -1 : 0;
    number = ours.episode * 2 + offset;
  }
  const byNumber = tmdbEpisodes.find((t) => t.episode_number === number);
  return byNumber ? { episode: byNumber, how: 'number' } : null;
}

/**
 * Match every episode of a season. Returns one entry per episode id:
 * { id, still, how } where still is the TMDB still path or null.
 */
export function matchSeason(ourEpisodes, tmdbEpisodes) {
  const doubled = usesDoubledNumbering(tmdbEpisodes, ourEpisodes);
  return ourEpisodes.map((ours) => {
    const match = matchEpisode(ours, tmdbEpisodes, { doubled });
    return {
      id: ours.id,
      still: match?.episode?.still_path ?? null,
      how: match ? match.how : 'none',
    };
  });
}
