import { Link } from 'react-router-dom';
import { SHOW_LIST } from '../data/index.js';

export default function ShowGrid({ title = 'Browse by show' }) {
  return (
    <section aria-labelledby="shows-heading">
      <h2 className="section-label" id="shows-heading">
        {title}
      </h2>
      <div className="show-grid">
        {SHOW_LIST.map((show) => (
          <Link
            key={show.id}
            to={`/show/${show.id}`}
            className="show-card"
            style={{ '--show-color': show.color }}
          >
            <span className="show-card__emoji" aria-hidden="true">
              {show.emoji}
            </span>
            <span className="show-card__name">{show.name}</span>
            <span className="show-card__count">
              {show.episodeCount} {show.isYouTube ? 'videos' : 'episodes'}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
