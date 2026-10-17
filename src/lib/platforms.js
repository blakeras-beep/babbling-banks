/**
 * Where-to-watch links. Episodes may carry their own `platformUrl`; otherwise
 * we build a search link on the platform the show streams on.
 */
const SEARCH_URLS = {
  'Disney+': (q) => `https://www.disneyplus.com/search/${encodeURIComponent(q)}`,
  Hulu: (q) => `https://www.hulu.com/search?q=${encodeURIComponent(q)}`,
  Netflix: (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
  'Paramount+': (q) => `https://www.paramountplus.com/search/?q=${encodeURIComponent(q)}`,
  'PBS Kids': (q) => `https://pbskids.org/search?q=${encodeURIComponent(q)}`,
  Max: (q) => `https://www.max.com/search?q=${encodeURIComponent(q)}`,
  'Prime Video': (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  YouTube: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
};

export function getWatchUrl(episode, show) {
  if (episode.platform === 'YouTube' && episode.videoId) {
    return `https://www.youtube.com/watch?v=${episode.videoId}`;
  }
  if (episode.platformUrl) return episode.platformUrl;
  const build = SEARCH_URLS[episode.platform];
  if (build) return build(`${show?.name ?? ''} ${episode.title}`.trim());
  if (show?.platformUrl) return show.platformUrl;
  return null;
}

export function getPlatformColor(platform) {
  switch (platform) {
    case 'YouTube':
      return '#FF0000';
    case 'Disney+':
      return '#113CCF';
    case 'Hulu':
      return '#1CE783';
    case 'Netflix':
      return '#E50914';
    case 'Max':
      return '#002BE7';
    case 'PBS Kids':
      return '#00A651';
    case 'Paramount+':
      return '#0064FF';
    case 'Prime Video':
      return '#00A8E1';
    default:
      return null;
  }
}

/** Short, scannable title for lists; falls back to the full title. */
export function getDisplayTitle(episode) {
  return episode.shortTitle || episode.title;
}

/** Human-friendly episode code: "S1 E3", "S2 E4b", or "Video" for YouTube. */
export function formatEpisodeCode(episode, { long = false } = {}) {
  if (episode.platform === 'YouTube') return 'Video';
  const segment = episode.segment ? episode.segment.toLowerCase() : '';
  if (long) return `Season ${episode.season} • Episode ${episode.episode}${segment}`;
  return `S${episode.season} E${episode.episode}${segment}`;
}

export function formatDuration(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
