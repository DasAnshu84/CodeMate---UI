/**
 * Validated environment variables.
 * Throws at module load time if any required var is missing.
 */

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(`Missing env var: ${key}`);
  }
  return value;
}

export const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY');
export const SITE_URL = requireEnv('VITE_SITE_URL');
export const WS_URL = requireEnv('VITE_WS_URL');
