import { Component } from 'react';

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
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }} aria-hidden="true">
          😵
        </div>
        <h1 style={{ margin: '12px 0 8px' }}>Something went wrong</h1>
        <p style={{ color: 'var(--bb-text-light)', marginBottom: 20 }}>
          Sorry about that. Reloading usually fixes it.
        </p>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
