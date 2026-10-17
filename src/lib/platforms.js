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

/**
 * Label for the watch button. "Play this one" only when the link opens the
 * video itself; a platform search page gets "Open on <platform>".
 */
export function getWatchLabel(episode, show) {
  if (episode.platform === 'YouTube' && episode.videoId) return 'Play this one';
  if (episode.platformUrl) return 'Play this one';
  const platform = episode.platform || show?.platform;
  return platform ? `Open on ${platform}` : 'Find where to watch';
}

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

/** Episode code as the brand writes it: "S2E14", "S1E07a", or "Video" for YouTube. */
export function formatEpisodeCode(episode) {
  if (episode.platform === 'YouTube') return 'Video';
  const segment = episode.segment ? episode.segment.toLowerCase() : '';
  return `S${episode.season}E${String(episode.episode).padStart(2, '0')}${segment}`;
}

/**
 * Official thumbnail, 16:9. YouTube publishes one per video; the catalog
 * carries no images for the streaming shows, so those use the placeholder.
 */
export function getThumbnailUrl(episode) {
  if (episode.thumbnailUrl) return episode.thumbnailUrl;
  if (episode.platform === 'YouTube' && episode.videoId) {
    return `https://i.ytimg.com/vi/${episode.videoId}/hqdefault.jpg`;
  }
  return null;
}

export function formatDuration(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
