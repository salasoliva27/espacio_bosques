import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const signOut = () => supabase.auth.signOut();

const SIM_USER = {
  id: 'sim-user',
  email: 'demo@bosques.mx',
  role: 'authenticated',
  user_metadata: { full_name: 'Demo Usuario' },
  created_at: '2024-01-01T00:00:00Z',
} as any;

const SIM_SESSION = { user: SIM_USER, access_token: 'sim-token', token_type: 'bearer' } as any;

/** Use instead of supabase.auth.getSession() — returns sim session in SIMULATION_MODE */
export async function getSession() {
  if (import.meta.env.VITE_SIMULATION_MODE === 'true') {
    return { data: { session: SIM_SESSION }, error: null };
  }
  return supabase.auth.getSession();
}
