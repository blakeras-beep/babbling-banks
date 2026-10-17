import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { readStorage, writeStorage, STORAGE_KEYS } from './storage.js';

/**
 * Light ("day") is the standard theme. "night" is opt-in from the toggle and
 * remembered on the device; the system color-scheme preference is not read.
 */
const ThemeContext = createContext({
  theme: 'light',
  resolvedTheme: 'light',
  setTheme() {},
  toggleTheme() {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStorage(STORAGE_KEYS.theme, 'light'));

  // Anything other than an explicit "dark" (including the old "system" value) is light.
  const resolvedTheme = theme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolvedTheme === 'dark' ? '#111613' : '#F5F6F2');
  }, [resolvedTheme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    writeStorage(STORAGE_KEYS.theme, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
