import { Link } from 'react-router-dom';
import { getShowName } from '../data/index.js';
import { formatEpisodeCode } from '../lib/platforms.js';
import FavoriteButton from './FavoriteButton.jsx';

export function CrayonDivider() {
  return <span className="crayon-line" aria-hidden="true" />;
}

/** A result row: title, show and code below in muted, heart right. */
export default function ResultRow({ episode, query = '' }) {
  return (
    <div className="row">
      <Link
        to={`/episode/${episode.id}`}
        state={query ? { q: query } : undefined}
        className="row__main"
      >
        <span className="row__title">{episode.title}</span>
        <span className="row__caption">
          {getShowName(episode.show)} · <span className="code">{formatEpisodeCode(episode)}</span>
        </span>
      </Link>
      <FavoriteButton episode={episode} />
    </div>
  );
}

/** Rows separated by cobalt crayon lines. */
export function ResultRows({ episodes, query = '' }) {
  return (
    <div className="rows">
      {episodes.map((episode, index) => (
        <div key={episode.id} className="rows__item">
          {index > 0 && <CrayonDivider />}
          <ResultRow episode={episode} query={query} />
        </div>
      ))}
    </div>
  );
}
