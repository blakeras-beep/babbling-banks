import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';

const COPY = {
  signin: {
    icon: '👋',
    title: 'Welcome back!',
    subtitle: 'Sign in to sync your favorites across devices',
    submit: 'Sign In',
  },
  signup: {
    icon: '✨',
    title: 'Create account',
    subtitle: 'Save the episodes your little one loves',
    submit: 'Create Account',
  },
  reset: {
    icon: '🔑',
    title: 'Reset password',
    subtitle: "We'll email you a link to choose a new one",
    submit: 'Send reset link',
  },
};

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, signIn, signUp, resetPassword, favorites } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const emailRef = useRef(null);

  useEffect(() => {
    if (!authModalOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && closeAuthModal();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => emailRef.current?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [authModalOpen, closeAuthModal]);

  useEffect(() => {
    if (!authModalOpen) {
      setMode('signin');
      setPassword('');
      setConfirm('');
      setError('');
      setSuccess('');
      setBusy(false);
    }
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        if (password !== confirm) return setError('Passwords do not match');
        if (password.length < 6) return setError('Password must be at least 6 characters');
        const { data, error: signUpError } = await signUp(email, password);
        if (signUpError) return setError(signUpError.message);
        if (data?.session) closeAuthModal();
        else setSuccess('Check your email to confirm your account, then sign in.');
      } else if (mode === 'reset') {
        const { error: resetError } = await resetPassword(email);
        if (resetError) return setError(resetError.message);
        setSuccess('If that email has an account, a reset link is on its way.');
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) return setError(signInError.message);
        closeAuthModal();
      }
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const copy = COPY[mode];

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => event.target === event.currentTarget && closeAuthModal()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" className="modal__close" onClick={closeAuthModal} aria-label="Close">
          ✕
        </button>
        <div className="modal__header">
          <div className="modal__icon" aria-hidden="true">
            {copy.icon}
          </div>
          <h2 className="modal__title" id="auth-title">
            {copy.title}
          </h2>
          <p className="modal__subtitle">{copy.subtitle}</p>
        </div>
        <div className="modal__body">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field__label" htmlFor="auth-email">
                Email address
              </label>
              <input
                id="auth-email"
                ref={emailRef}
                className="field__input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            {mode !== 'reset' && (
              <div className="field">
                <label className="field__label" htmlFor="auth-password">
                  Password
                </label>
                <input
                  id="auth-password"
                  className="field__input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
              </div>
            )}
            {mode === 'signup' && (
              <div className="field">
                <label className="field__label" htmlFor="auth-confirm">
                  Confirm password
                </label>
                <input
                  id="auth-confirm"
                  className="field__input"
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}
            {error && (
              <div className="notice notice--error" role="alert" style={{ marginBottom: 16 }}>
                <span aria-hidden="true">⚠️</span> {error}
              </div>
            )}
            {success && (
              <div className="notice notice--success" role="status" style={{ marginBottom: 16 }}>
                <span aria-hidden="true">✅</span> {success}
              </div>
            )}
            {mode === 'signin' && favorites.length > 0 && !error && !success && (
              <p style={{ fontSize: '0.85rem', color: 'var(--bb-text-muted)', marginBottom: 16 }}>
                The {favorites.length} favorite{favorites.length === 1 ? '' : 's'} saved on this
                device will be added to your account.
              </p>
            )}
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Please wait…' : copy.submit}
            </button>
          </form>
          <div className="modal__footer">
            {mode === 'signin' && (
              <>
                <span>
                  Don&apos;t have an account?{' '}
                  <button type="button" className="btn--link" onClick={() => switchMode('signup')}>
                    Sign up
                  </button>
                </span>
                <button type="button" className="btn--link" onClick={() => switchMode('reset')}>
                  Forgot your password?
                </button>
              </>
            )}
            {mode === 'signup' && (
              <span>
                Already have an account?{' '}
                <button type="button" className="btn--link" onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </span>
            )}
            {mode === 'reset' && (
              <button type="button" className="btn--link" onClick={() => switchMode('signin')}>
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
