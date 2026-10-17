import { Link, useNavigate } from 'react-router-dom';
import { getShowName } from '../data/index.js';
import { formatDuration, formatEpisodeCode, getThumbnailUrl } from '../lib/platforms.js';

const FIELD_LABELS = {
  title: 'the title',
  alias: 'how parents say it',
  song: 'a song',
  character: 'a character',
  object: 'something in it',
  theme: 'a theme',
  setting: 'a place',
};

/** Official thumbnail, 16:9, no radius, no filters; surface-sunk placeholder otherwise. */
export function Thumbnail({ episode }) {
  const url = getThumbnailUrl(episode);
  return (
    <div
      className="thumb"
      role={url ? undefined : 'img'}
      aria-label={url ? undefined : 'Episode image'}
    >
      {url ? <img src={url} alt="" loading="lazy" decoding="async" /> : 'Episode image'}
    </div>
  );
}

export function CaptionRow({ episode, showLink = false }) {
  const name = getShowName(episode.show);
  return (
    <p className="caption-row">
      {showLink ? (
        <Link to={`/show/${episode.show}`} className="show-name">
          {name}
        </Link>
      ) : (
        <span className="show-name">{name}</span>
      )}
      <span className="code">{formatEpisodeCode(episode)}</span>
      {episode.duration && <span className="runtime">{formatDuration(episode.duration)}</span>}
    </p>
  );
}

/**
 * The result card (+1°): title in headline type, caption row, official thumbnail.
 * The whole card opens the episode; the search is passed along for "what they said".
 */
export default function ResultCard({ episode, matches = [], query = '' }) {
  const navigate = useNavigate();
  const href = `/episode/${episode.id}`;
  const state = query ? { q: query } : undefined;
  const reason = matches.find((m) => m.field !== 'title');

  return (
    <article
      className="tape tape--card result-card"
      onClick={(event) => {
        if (event.target.closest('a, button')) return;
        navigate(href, { state });
      }}
    >
      <h2 className="result-card__title">
        <Link to={href} state={state}>
          {episode.title}
        </Link>
      </h2>
      <CaptionRow episode={episode} />
      <Thumbnail episode={episode} />
      {reason && (
        <p className="result-card__reason">
          Matched {FIELD_LABELS[reason.field] ?? reason.field}: “{reason.text}”
        </p>
      )}
    </article>
  );
}
