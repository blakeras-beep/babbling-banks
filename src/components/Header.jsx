import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { useTheme } from '../lib/ThemeContext.jsx';

export default function Header() {
  const { user, favorites, signOut, openAuthModal, authEnabled } = useAuth();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const themeIcon = theme === 'system' ? '🌓' : resolvedTheme === 'dark' ? '🌙' : '☀️';
  const themeName = theme === 'system' ? 'system (follows your device)' : theme;
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__brand" aria-label="Babbling Banks home">
          <img src="/logo.png" alt="" width="44" height="44" />
          <span className="header__brand-text">Babbling Banks</span>
        </Link>
        <nav className="header__nav" aria-label="Main">
          <NavLink
            to="/shows"
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
          >
            <span className="nav-link__icon" aria-hidden="true">
              📺
            </span>
            <span className="nav-link__label">Shows</span>
          </NavLink>
          <NavLink
            to="/favorites"
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
          >
            <span className="nav-link__icon" aria-hidden="true">
              ❤️
            </span>
            <span className="nav-link__label">Favorites</span>
            {favorites.length > 0 && <span className="nav-link__badge">{favorites.length}</span>}
          </NavLink>
          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-label={`Theme: ${themeName}. Switch to ${nextTheme}`}
            title={`Theme: ${themeName}. Click for ${nextTheme}`}
          >
            <span aria-hidden="true">{themeIcon}</span>
          </button>
          {authEnabled &&
            (user ? (
              <div className="user-menu">
                <button
                  type="button"
                  className="user-menu__trigger"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <span aria-hidden="true">👤</span>
                  <span className="user-menu__name">{user.email?.split('@')[0]}</span>
                </button>
                {menuOpen && (
                  <>
                    <div className="user-menu__backdrop" onClick={() => setMenuOpen(false)} />
                    <div className="user-menu__panel" role="menu">
                      <div className="user-menu__email">{user.email}</div>
                      <Link to="/favorites" className="user-menu__item" role="menuitem">
                        <span aria-hidden="true">❤️</span> My favorites
                      </Link>
                      <button
                        type="button"
                        className="user-menu__item user-menu__item--danger"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          signOut();
                        }}
                      >
                        <span aria-hidden="true">🚪</span> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                onClick={openAuthModal}
                style={{ padding: '10px 16px' }}
              >
                Sign in
              </button>
            ))}
        </nav>
      </div>
    </header>
  );
}
