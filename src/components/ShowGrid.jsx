import { Link } from 'react-router-dom';
import { SHOW_LIST } from '../data/index.js';
import { CrayonDivider } from './ResultRow.jsx';
import Icon from './Icon.jsx';

/** Every show as a row with its count, separated by crayon lines. */
export default function ShowGrid({ title = 'browse by show' }) {
  return (
    <section aria-labelledby="shows-heading">
      <h2 className="section-label" id="shows-heading">
        {title}
      </h2>
      <div className="rows">
        {SHOW_LIST.map((show, index) => (
          <div key={show.id}>
            {index > 0 && <CrayonDivider />}
            <Link to={`/show/${show.id}`} className="row row__main">
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="row__title">{show.name}</span>
                <span className="row__caption">
                  {show.episodeCount} {show.isYouTube ? 'videos' : 'episodes'}
                </span>
              </span>
              <span className="tap" aria-hidden="true">
                <Icon name="caretRight" />
              </span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
