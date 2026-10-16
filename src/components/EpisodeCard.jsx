import { Link, useNavigate } from 'react-router-dom';
import { getShowColor, getShowEmoji, getShowName } from '../data/index.js';
import { formatEpisodeCode } from '../lib/platforms.js';
import FavoriteButton from './FavoriteButton.jsx';
import Highlight from './Highlight.jsx';

const FIELD_LABELS = {
  title: 'title',
  alias: 'also known as',
  song: 'song',
  character: 'character',
  object: 'mentions',
  theme: 'theme',
  setting: 'place',
};

export default function EpisodeCard({ episode, highlightTerms = [], matches = [], index = 0 }) {
  const navigate = useNavigate();
  const href = `/episode/${episode.id}`;
  const bestMatch = matches.find((m) => m.field !== 'title');

  const handleCardClick = (event) => {
    // Let real links and buttons inside the card do their own thing.
    if (event.target.closest('a, button')) return;
    navigate(href);
  };

  return (
    <article
      className="episode-card"
      onClick={handleCardClick}
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <div
        className="episode-card__emoji"
        style={{ backgroundColor: `${getShowColor(episode.show)}22` }}
        aria-hidden="true"
      >
        {getShowEmoji(episode.show)}
      </div>
      <div className="episode-card__body">
        <div className="episode-card__top">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 className="episode-card__title">
              <Link to={href} style={{ color: 'inherit', textDecoration: 'none' }}>
                <Highlight text={episode.title} terms={highlightTerms} />
              </Link>
            </h3>
            <div className="episode-card__meta">
              <strong style={{ color: getShowColor(episode.show) }}>
                {getShowName(episode.show)}
              </strong>
              <span aria-hidden="true">•</span>
              <span>{formatEpisodeCode(episode)}</span>
              <span aria-hidden="true">•</span>
              <span>{episode.platform}</span>
            </div>
          </div>
          <FavoriteButton episode={episode} />
        </div>
        {episode.shortDescription && (
          <p className="episode-card__description">
            <Highlight text={episode.shortDescription} terms={highlightTerms} />
          </p>
        )}
        {bestMatch && (
          <p className="episode-card__match">
            Matched {FIELD_LABELS[bestMatch.field] ?? bestMatch.field}: <em>“{bestMatch.text}”</em>
          </p>
        )}
        {episode.songs?.length > 0 && (
          <div className="episode-card__songs">
            <span aria-hidden="true">🎵</span>
            {episode.songs.slice(0, 3).map((song) => (
              <span className="tag" key={song.title}>
                {song.title}
              </span>
            ))}
            {episode.songs.length > 3 && <span>+{episode.songs.length - 3} more</span>}
          </div>
        )}
      </div>
    </article>
  );
}
