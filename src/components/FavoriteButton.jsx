import { useAuth } from '../lib/AuthContext.jsx';
import Icon from './Icon.jsx';

/** Heart in a 48 px target. Labelled variant reads "Keep it" / "Kept". */
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
      className={`${labelled ? 'text-action' : 'tap'} heart-button ${saved ? 'is-saved' : ''} ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={
        labelled
          ? undefined
          : saved
            ? `Remove ${episode.title} from repeat offenders`
            : `Keep ${episode.title} as a repeat offender`
      }
    >
      <Icon name={saved ? 'heartFill' : 'heart'} />
      {labelled && <span>{saved ? 'Kept' : 'Keep it'}</span>}
    </button>
  );
}
