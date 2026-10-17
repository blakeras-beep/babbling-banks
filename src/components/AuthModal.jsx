import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import Icon from './Icon.jsx';

const COPY = {
  signin: {
    title: 'Back again.',
    subtitle: 'Sign in to keep your repeat offenders on every device.',
    submit: 'Sign in',
  },
  signup: {
    title: 'Make an account.',
    subtitle: 'Keep the episodes they ask for, on your phone and your laptop.',
    submit: 'Make it',
  },
  reset: {
    title: 'Reset password.',
    subtitle: 'We will email you a link to choose a new one.',
    submit: 'Send the link',
  },
};

/**
 * Sign-in sheet: a full-screen surface with a 40% ink scrim behind, tape-strip
 * fields and the ink primary button.
 */
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
        if (password !== confirm) return setError('Those passwords do not match.');
        if (password.length < 6) return setError('Passwords need at least 6 characters.');
        const { data, error: signUpError } = await signUp(email, password);
        if (signUpError) return setError(signUpError.message);
        if (data?.session) closeAuthModal();
        else setSuccess('Check your email to confirm the account, then sign in.');
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
      className="sheet-backdrop"
      onClick={(event) => event.target === event.currentTarget && closeAuthModal()}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button
          type="button"
          className="tap sheet__close"
          onClick={closeAuthModal}
          aria-label="Close"
        >
          <Icon name="x" />
        </button>
        <div className="col">
          <div className="tape tape--headline headline-strip headline-strip--plain">
            <h2 className="headline-strip__text" id="auth-title">
              {copy.title}
            </h2>
          </div>
          <p className="lead">{copy.subtitle}</p>
          <form onSubmit={handleSubmit} className="sheet__form">
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
                  autoComplete="new-password"
                  required
                />
              </div>
            )}
            {error && (
              <p className="note note--error" role="alert">
                <Icon name="warningCircle" size={16} /> {error}
              </p>
            )}
            {success && (
              <p className="note note--success" role="status">
                {success}
              </p>
            )}
            {mode === 'signin' && favorites.length > 0 && !error && !success && (
              <p className="notice notice--muted" style={{ marginTop: 0 }}>
                The {favorites.length} repeat offender{favorites.length === 1 ? '' : 's'} on this
                device will join your account.
              </p>
            )}
            <div>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'One moment…' : copy.submit}
              </button>
            </div>
          </form>
          <div className="sheet__footer">
            {mode === 'signin' && (
              <>
                <button type="button" className="text-action" onClick={() => switchMode('signup')}>
                  No account yet? Make one
                </button>
                <button type="button" className="text-action" onClick={() => switchMode('reset')}>
                  Forgot the password?
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" className="text-action" onClick={() => switchMode('signin')}>
                Already have one? Sign in
              </button>
            )}
            {mode === 'reset' && (
              <button type="button" className="text-action" onClick={() => switchMode('signin')}>
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
