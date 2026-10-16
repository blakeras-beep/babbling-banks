import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { getEpisode } from '../data/index.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import EpisodeCard from '../components/EpisodeCard.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function FavoritesPage() {
  const { favorites, user, authEnabled, openAuthModal, syncing } = useAuth();
  useDocumentTitle('Favorites');
  const episodes = favorites.map(getEpisode).filter(Boolean);

  return (
    <div className="container">
      <h1 className="page__title">❤️ Favorites</h1>
      <p className="page__subtitle">
        {user
          ? `Synced to ${user.email}.`
          : authEnabled
            ? 'Saved on this device. Sign in to keep them across devices.'
            : 'Saved on this device.'}
        {syncing ? ' Syncing…' : ''}
      </p>

      {!user && authEnabled && episodes.length > 0 && (
        <div className="notice" style={{ marginBottom: 20 }}>
          <span aria-hidden="true">☁️</span>
          <span>
            <button type="button" className="btn--link" onClick={openAuthModal}>
              Sign in
            </button>{' '}
            to back these up and see them on your phone and laptop.
          </span>
        </div>
      )}

      {episodes.length === 0 ? (
        <EmptyState emoji="💝" title="No favorites yet">
          <p>Search for an episode and tap the heart to save it here.</p>
          <p style={{ marginTop: 12 }}>
            <Link to="/" className="btn btn--primary">
              Start searching
            </Link>
          </p>
        </EmptyState>
      ) : (
        <div className="stack">
          {episodes.map((episode, index) => (
            <EpisodeCard key={episode.id} episode={episode} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
