import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { auth, favoritesApi, isSupabaseConfigured } from './supabase.js';
import { readStorage, writeStorage, STORAGE_KEYS } from './storage.js';

/**
 * Auth + favourites.
 *
 * - Signed out: favourites are stored on this device (localStorage).
 * - Signed in:  favourites sync to Supabase. Any device favourites are merged
 *               into the account the first time the user signs in.
 * - No Supabase configured: the app runs in local-only mode.
 */
const AuthContext = createContext(null);

const readLocalFavorites = () => {
  const list = readStorage(STORAGE_KEYS.favorites, []);
  return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [favorites, setFavorites] = useState(readLocalFavorites);
  const [syncing, setSyncing] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const mergedForUser = useRef(null);

  const loadRemoteFavorites = useCallback(async (currentUser) => {
    setSyncing(true);
    try {
      // Merge device favourites into the account once per session.
      const local = readLocalFavorites();
      if (local.length > 0 && mergedForUser.current !== currentUser.id) {
        mergedForUser.current = currentUser.id;
        await favoritesApi.addMany(
          local.map((episodeId) => ({
            user_id: currentUser.id,
            episode_id: episodeId,
            episode_data: null,
          }))
        );
        writeStorage(STORAGE_KEYS.favorites, []);
      }
      const { data, error } = await favoritesApi.getAll();
      if (!error && data) setFavorites(data.map((row) => row.episode_id));
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    (async () => {
      const session = await auth.getSession();
      if (cancelled) return;
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) await loadRemoteFavorites(sessionUser);
      if (!cancelled) setLoading(false);
    })();

    const {
      data: { subscription },
    } = auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) loadRemoteFavorites(sessionUser);
      else setFavorites(readLocalFavorites());
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadRemoteFavorites]);

  const toggleFavorite = useCallback(
    async (episode) => {
      const episodeId = typeof episode === 'string' ? episode : episode.id;
      const isSaved = favorites.includes(episodeId);
      const next = isSaved ? favorites.filter((id) => id !== episodeId) : [episodeId, ...favorites];
      setFavorites(next); // optimistic

      if (!user) {
        writeStorage(STORAGE_KEYS.favorites, next);
        return true;
      }

      const summary =
        typeof episode === 'object'
          ? {
              title: episode.title,
              show: episode.show,
              season: episode.season,
              episode: episode.episode,
              platform: episode.platform,
            }
          : null;
      const { error } = isSaved
        ? await favoritesApi.remove(episodeId)
        : await favoritesApi.add(episodeId, summary);
      if (error) {
        setFavorites(favorites); // roll back
        return false;
      }
      return true;
    },
    [favorites, user]
  );

  const isFavorite = useCallback((episodeId) => favorites.includes(episodeId), [favorites]);

  const signOut = useCallback(async () => {
    const { error } = await auth.signOut();
    if (!error) {
      setUser(null);
      mergedForUser.current = null;
      setFavorites(readLocalFavorites());
    }
    return { error };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      syncing,
      favorites,
      isFavorite,
      toggleFavorite,
      signIn: auth.signIn,
      signUp: auth.signUp,
      resetPassword: auth.resetPassword,
      signOut,
      authEnabled: isSupabaseConfigured,
      authModalOpen,
      openAuthModal: () => setAuthModalOpen(true),
      closeAuthModal: () => setAuthModalOpen(false),
    }),
    [user, loading, syncing, favorites, isFavorite, toggleFavorite, signOut, authModalOpen]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
