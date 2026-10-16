/**
 * Small localStorage wrapper. Every call is guarded: private browsing,
 * blocked storage and SSR all degrade to in-memory defaults.
 */
const PREFIX = 'babbling-banks:';

export function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export const STORAGE_KEYS = {
  theme: 'theme',
  favorites: 'favorites',
  recentSearches: 'recent-searches',
};

const MAX_RECENT = 8;

export function getRecentSearches() {
  const list = readStorage(STORAGE_KEYS.recentSearches, []);
  return Array.isArray(list) ? list.filter((item) => typeof item === 'string') : [];
}

export function addRecentSearch(query) {
  const trimmed = (query ?? '').trim();
  if (trimmed.length < 2) return getRecentSearches();
  const existing = getRecentSearches().filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase()
  );
  const next = [trimmed, ...existing].slice(0, MAX_RECENT);
  writeStorage(STORAGE_KEYS.recentSearches, next);
  return next;
}

export function clearRecentSearches() {
  removeStorage(STORAGE_KEYS.recentSearches);
  return [];
}
