import { Link, useMatch, useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/ThemeContext.jsx';
import Icon from './Icon.jsx';

/**
 * 56 px header on paper: the SVG wordmark (never live text) left, the heart
 * ("Repeat offenders") right, and a back caret on detail screens.
 */
export default function Header() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const onEpisode = useMatch('/episode/:id');
  const onShow = useMatch('/show/:showId');
  const showBack = Boolean(onEpisode || onShow);
  const wordmark = resolvedTheme === 'dark' ? '/logo/wordmark-reversed.svg' : '/logo/wordmark.svg';

  return (
    <header className="header">
      <div className="header__left">
        {showBack && (
          <button
            type="button"
            className="tap"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            aria-label="Back"
          >
            <Icon name="caretLeft" />
          </button>
        )}
        <Link
          to="/"
          className={`header__wordmark ${showBack ? 'header__wordmark--after-back' : ''}`}
        >
          <img src={wordmark} alt="babbling banks" width="136" height="24" />
        </Link>
      </div>
      <Link to="/favorites" className="tap" aria-label="Repeat offenders" title="Repeat offenders">
        <Icon name="heart" />
      </Link>
    </header>
  );
}
