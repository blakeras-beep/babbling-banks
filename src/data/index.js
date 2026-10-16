/**
 * Episode catalog.
 *
 * Show metadata lives in `shows.json`; each show's episodes live in
 * `episodes/<showId>.json`. Add a new show by dropping a file in `episodes/`
 * and importing it here, or by running `npm run generate-catalog -- --show=<id>`.
 */
import shows from './shows.json';
import bluey from './episodes/bluey.json';
import curiousGeorge from './episodes/curious_george.json';
import sesameStreet from './episodes/sesame_street.json';
import danielTiger from './episodes/daniel_tiger.json';
import mickeyMouseFunhouse from './episodes/mickey_mouse_funhouse.json';
import missRachel from './episodes/miss_rachel.json';

export const SHOWS = shows;

export const EPISODES = [
  ...bluey,
  ...curiousGeorge,
  ...sesameStreet,
  ...danielTiger,
  ...mickeyMouseFunhouse,
  ...missRachel,
];

const EPISODES_BY_ID = new Map(EPISODES.map((episode) => [episode.id, episode]));

export const SHOW_LIST = Object.values(SHOWS).map((show) => ({
  ...show,
  episodeCount: EPISODES.filter((episode) => episode.show === show.id).length,
}));

export function getEpisode(id) {
  return EPISODES_BY_ID.get(id) ?? null;
}

export function getShow(showId) {
  return SHOWS[showId] ?? null;
}

export function getEpisodesForShow(showId) {
  return EPISODES.filter((episode) => episode.show === showId);
}

export function getShowName(showId) {
  return SHOWS[showId]?.name ?? showId;
}

export function getShowEmoji(showId) {
  return SHOWS[showId]?.emoji ?? '📺';
}

export function getShowColor(showId) {
  return SHOWS[showId]?.color ?? '#2E9B9B';
}
