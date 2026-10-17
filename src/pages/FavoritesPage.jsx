import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { getEpisode } from '../data/index.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useArtCredit } from '../lib/CreditContext.jsx';
import { ResultRows } from '../components/ResultRow.jsx';

/** "Repeat offenders": the kept episodes as rows. Not in the kit; built from its parts. */
export default function FavoritesPage() {
  const { favorites, user, authEnabled, openAuthModal, signOut, syncing } = useAuth();
  useDocumentTitle('Repeat offenders');
  useArtCredit('several');
  const episodes = favorites.map(getEpisode).filter(Boolean);

  return (
    <div className="col">
      <div className="tape tape--headline headline-strip headline-strip--plain">
        <h1 className="headline-strip__text">
          Repeat
          <br />
          offenders.
        </h1>
      </div>
      <p className="lead">The ones they ask for again. And again.</p>
      <p className="notice notice--muted">
        {user
          ? `Synced to ${user.email}.`
          : authEnabled
            ? 'Saved on this device.'
            : 'Saved on this device.'}
        {syncing ? ' Syncing…' : ''}
      </p>

      {authEnabled && !user && (
        <p className="notice">
          <button type="button" className="text-action" onClick={openAuthModal}>
            Sign in
          </button>{' '}
          to keep them on your phone and your laptop.
        </p>
      )}
      {authEnabled && user && (
        <p className="notice">
          <button type="button" className="text-action" onClick={signOut}>
            Sign out
          </button>
        </p>
      )}

      {episodes.length === 0 ? (
        <section className="tape empty-strip" role="status">
          <h2 className="empty-strip__title">Nothing kept yet.</h2>
          <p className="body-text">Find an episode and tap the heart. It will wait here.</p>
          <p className="body-text" style={{ marginTop: 16 }}>
            <Link to="/" className="btn-secondary">
              Start finding
            </Link>
          </p>
        </section>
      ) : (
        <section style={{ marginTop: 16 }}>
          <ResultRows episodes={episodes} />
        </section>
      )}
    </div>
  );
}
