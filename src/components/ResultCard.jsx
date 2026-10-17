import { Link, useNavigate } from 'react-router-dom';
import { getShowName } from '../data/index.js';
import { formatDuration, formatEpisodeCode, getThumbnailUrl } from '../lib/platforms.js';

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
export default function ResultCard({ episode, query = '' }) {
  const navigate = useNavigate();
  const href = `/episode/${episode.id}`;
  const state = query ? { q: query } : undefined;

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
    </article>
  );
}
