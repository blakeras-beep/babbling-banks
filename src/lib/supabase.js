/**
 * Supabase client and thin data-access helpers.
 *
 * The client is optional: when the VITE_SUPABASE_* variables are missing the
 * app runs in "local mode" (search works, favourites live in localStorage).
 *
 * The Supabase SDK is loaded lazily, only when it is configured, so the
 * local-mode bundle never ships it.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  /^https?:\/\//.test(supabaseUrl) &&
  !supabaseUrl.includes('your-project')
);

let clientPromise = null;

/** Resolves to the Supabase client, or null when not configured. */
export function getSupabase() {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(supabaseUrl, supabaseAnonKey)
    );
  }
  return clientPromise;
}

const notConfigured = () => ({ data: null, error: new Error('Supabase is not configured') });

export const auth = {
  async signUp(email, password) {
    const supabase = await getSupabase();
    if (!supabase) return notConfigured();
    return supabase.auth.signUp({ email, password });
  },
  async signIn(email, password) {
    const supabase = await getSupabase();
    if (!supabase) return notConfigured();
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signOut() {
    const supabase = await getSupabase();
    if (!supabase) return { error: null };
    return supabase.auth.signOut();
  },
  async getSession() {
    const supabase = await getSupabase();
    if (!supabase) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },
  /** Resolves to an unsubscribe function. */
  async onAuthStateChange(callback) {
    const supabase = await getSupabase();
    if (!supabase) return () => {};
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
  },
  async resetPassword(email) {
    const supabase = await getSupabase();
    if (!supabase) return notConfigured();
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  },
  async updatePassword(password) {
    const supabase = await getSupabase();
    if (!supabase) return notConfigured();
    return supabase.auth.updateUser({ password });
  },
};

export const favoritesApi = {
  async getAll() {
    const supabase = await getSupabase();
    if (!supabase) return notConfigured();
    return supabase
      .from('favorites')
      .select('episode_id, created_at')
      .order('created_at', { ascending: false });
  },
  async add(episodeId, episodeData) {
    const supabase = await getSupabase();
    if (!supabase) return notConfigured();
    return supabase
      .from('favorites')
      .upsert([{ episode_id: episodeId, episode_data: episodeData }], {
        onConflict: 'user_id,episode_id',
      })
      .select();
  },
  async addMany(rows) {
    const supabase = await getSupabase();
    if (!supabase) return notConfigured();
    return supabase.from('favorites').upsert(rows, { onConflict: 'user_id,episode_id' }).select();
  },
  async remove(episodeId) {
    const supabase = await getSupabase();
    if (!supabase) return notConfigured();
    return supabase.from('favorites').delete().eq('episode_id', episodeId);
  },
};
