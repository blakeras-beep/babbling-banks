import { Link, useNavigate } from 'react-router-dom';
import { getShowColor, getShowEmoji, getShowName } from '../data/index.js';
import { formatEpisodeCode, getDisplayTitle } from '../lib/platforms.js';
import FavoriteButton from './FavoriteButton.jsx';
import Highlight from './Highlight.jsx';

/** How a non-title match is explained: `${label} “${text}”`. */
const MATCH_LABELS = {
  alias: 'Also called',
  song: 'Has the song',
  character: 'Features',
  object: 'Mentions',
  theme: 'Theme',
  setting: 'Set in',
};

export default function EpisodeCard({
  episode,
  highlightTerms = [],
  matches = [],
  index = 0,
  variant,
}) {
  const navigate = useNavigate();
  const href = `/episode/${episode.id}`;
  const bestMatch = matches.find((m) => m.field !== 'title' && MATCH_LABELS[m.field]);

  const handleCardClick = (event) => {
    // Let real links and buttons inside the card do their own thing.
    if (event.target.closest('a, button')) return;
    navigate(href);
  };

  return (
    <article
      className={`episode-card ${variant === 'best' ? 'episode-card--best' : ''}`}
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
            {variant === 'best' && <div className="episode-card__badge">★ Best match</div>}
            <h3 className="episode-card__title">
              <Link to={href} style={{ color: 'inherit', textDecoration: 'none' }}>
                <Highlight text={getDisplayTitle(episode)} terms={highlightTerms} />
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
            {MATCH_LABELS[bestMatch.field]} <em>“{bestMatch.text}”</em>
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
