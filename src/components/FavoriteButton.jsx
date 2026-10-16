import { useAuth } from '../lib/AuthContext.jsx';

export default function FavoriteButton({ episode, labelled = false, className = '' }) {
  const { isFavorite, toggleFavorite } = useAuth();
  const saved = isFavorite(episode.id);

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(episode);
  };

  return (
    <button
      type="button"
      className={`favorite-button ${saved ? 'is-saved' : ''} ${labelled ? 'favorite-button--labelled' : ''} ${className}`}
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={
        saved ? `Remove ${episode.title} from favorites` : `Save ${episode.title} to favorites`
      }
      title={saved ? 'Remove from favorites' : 'Save to favorites'}
    >
      <span aria-hidden="true">{saved ? '❤️' : '🤍'}</span>
      {labelled && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
