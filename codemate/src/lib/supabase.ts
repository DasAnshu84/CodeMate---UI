import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

/**
 * Singleton Supabase client — never call createClient() elsewhere.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
