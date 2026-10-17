import { Component } from 'react';
import { artUrl, pieceFor } from '../lib/art.js';

const OFFLINE_PIECE = pieceFor('offline');

/**
 * Catches render crashes. Offline (a chunk failed to load, say) it shows the
 * offline strip; otherwise a plain tape strip with a reload. It renders outside
 * the router and providers, so it carries its own header and credit.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Babbling Banks crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const reload = () => window.location.reload();
    return (
      <>
        <header className="header">
          <a href="/" className="header__wordmark">
            <img src="/logo/wordmark.svg" alt="babbling banks" width="136" height="24" />
          </a>
        </header>
        <main className="page">
          <div className="col">
            <section className="tape spot-strip" style={{ marginTop: 56 }}>
              {offline && (
                <img className="spot-strip__art" src={artUrl(OFFLINE_PIECE, 'cutout')} alt="" />
              )}
              <h1 className="spot-strip__title">
                {offline ? 'No internet.' : 'Something came unstuck.'}
              </h1>
              <p className="spot-strip__body">
                {offline
                  ? 'We need it to look things up. Your repeat offenders still work.'
                  : 'Reloading usually fixes it.'}
              </p>
              <button type="button" className="btn-secondary" onClick={reload}>
                {offline ? 'Try again' : 'Reload'}
              </button>
            </section>
          </div>
        </main>
        {offline && OFFLINE_PIECE && (
          <footer className="credit-row">
            <span />
            <a href="/art" className="credit">
              Art by Banks · {OFFLINE_PIECE.title}
            </a>
          </footer>
        )}
      </>
    );
  }
}
