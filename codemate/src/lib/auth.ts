/**
 * SUPABASE SETUP REQUIRED:
 * 1. Authentication > Providers > Google: enable, add Client ID + Secret from Google Cloud Console
 * 2. Authentication > Providers > GitHub: enable, add Client ID + Secret from GitHub OAuth App
 * 3. Authentication > URL Configuration > Site URL: set to your production domain
 * 4. Authentication > URL Configuration > Redirect URLs: add
 *      http://localhost:5173/auth/callback
 *      https://yourdomain.com/auth/callback
 * 5. RLS: ensure Row Level Security is enabled on all tables
 */

import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { SITE_URL } from './env';

export type AuthResult = { data: Session } | { error: string };

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    return { data: data.session };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return { error: message };
  }
}

export async function signupWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.session) {
      // Email confirmation required — no session yet
      return { error: '__confirm_email__' };
    }
    return { data: data.session };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Signup failed';
    return { error: message };
  }
}

export async function loginWithGoogle(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: SITE_URL + '/auth/callback' },
    });
    if (error) return { error: error.message };
    // OAuth redirects — no session returned here
    return { error: '' };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Google login failed';
    return { error: message };
  }
}

export async function loginWithGitHub(): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: SITE_URL + '/auth/callback' },
    });
    if (error) return { error: error.message };
    // OAuth redirects — no session returned here
    return { error: '' };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'GitHub login failed';
    return { error: message };
  }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}
