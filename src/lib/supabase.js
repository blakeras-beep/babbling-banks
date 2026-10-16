/**
 * Supabase client and thin data-access helpers.
 *
 * The client is optional: when the VITE_SUPABASE_* variables are missing the
 * app runs in "local mode" (search works, favourites live in localStorage).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  /^https?:\/\//.test(supabaseUrl) &&
  !supabaseUrl.includes('your-project')
);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

const notConfigured = () => ({ data: null, error: new Error('Supabase is not configured') });

export const auth = {
  async signUp(email, password) {
    if (!supabase) return notConfigured();
    return supabase.auth.signUp({ email, password });
  },
  async signIn(email, password) {
    if (!supabase) return notConfigured();
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signOut() {
    if (!supabase) return { error: null };
    return supabase.auth.signOut();
  },
  async getSession() {
    if (!supabase) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },
  onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },
  async resetPassword(email) {
    if (!supabase) return notConfigured();
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },
  async updatePassword(password) {
    if (!supabase) return notConfigured();
    return supabase.auth.updateUser({ password });
  },
};

export const favoritesApi = {
  async getAll() {
    if (!supabase) return notConfigured();
    return supabase
      .from('favorites')
      .select('episode_id, created_at')
      .order('created_at', { ascending: false });
  },
  async add(episodeId, episodeData) {
    if (!supabase) return notConfigured();
    return supabase
      .from('favorites')
      .upsert([{ episode_id: episodeId, episode_data: episodeData }], {
        onConflict: 'user_id,episode_id',
      })
      .select();
  },
  async addMany(rows) {
    if (!supabase) return notConfigured();
    return supabase.from('favorites').upsert(rows, { onConflict: 'user_id,episode_id' }).select();
  },
  async remove(episodeId) {
    if (!supabase) return notConfigured();
    return supabase.from('favorites').delete().eq('episode_id', episodeId);
  },
};
