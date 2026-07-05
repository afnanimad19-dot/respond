import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Responde links to the same Supabase project used by PyDent (and future
// clinic products). Users sign in here with the same email + password they
// already use in that software, and we match their workspace membership.
//
// Configure by creating a .env file:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...
//
// When these are not set the app runs in Demo Mode with sample data so the
// whole experience can be tried without a backend.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const supabaseConfigured = supabase !== null;
