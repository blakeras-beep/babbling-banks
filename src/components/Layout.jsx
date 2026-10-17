import { Suspense, useEffect } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import Header from './Header.jsx';
import AuthModal from './AuthModal.jsx';
import LoadingScreen from './LoadingScreen.jsx';
import OfflineScreen from './OfflineScreen.jsx';
import { useCurrentCredit } from '../lib/CreditContext.jsx';
import { useTheme } from '../lib/ThemeContext.jsx';
import { creditText, getPiece } from '../lib/art.js';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

/** "Art by Banks · <title>" bottom-right, once per page. Links to the art page. */
function Credit() {
  const credit = useCurrentCredit();
  const { resolvedTheme, toggleTheme } = useTheme();
  if (credit === null) return null;
  const piece = credit === 'several' ? null : getPiece(credit);
  return (
    <footer className="credit-row">
      <button type="button" className="credit-row__theme" onClick={toggleTheme}>
        {resolvedTheme === 'dark' ? 'day' : 'night'}
      </button>
      <Link to="/art" className="credit">
        {creditText(piece)}
      </Link>
    </footer>
  );
}

/** The in-between states, reachable with ?preview=loading|offline for review. */
function Screen() {
  const [searchParams] = useSearchParams();
  const preview = searchParams.get('preview');
  if (preview === 'loading') return <LoadingScreen />;
  if (preview === 'offline') return <OfflineScreen onRetry={() => window.location.reload()} />;
  return <Outlet />;
}

export default function Layout() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main className="page">
        <Suspense fallback={<LoadingScreen />}>
          <Screen />
        </Suspense>
      </main>
      <Credit />
      <AuthModal />
    </>
  );
}
