import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client. Uses the project's secret API key, which
// bypasses row-level security entirely, so this file must never be
// imported from client code (no 'use client' entry point should reach it).
// It backs app/api/activity/route.ts, the only place allowed to read or
// write the activity table.
//
// Supabase is migrating from the old anon / service_role JWT pair to a new
// publishable / secret key pair (Project Settings > API Keys). This reads
// SUPABASE_SECRET_KEY (the new "Secret keys" key, looks like
// sb_secret_...) first, and falls back to SUPABASE_SERVICE_ROLE_KEY for
// projects still on the legacy key pair. Either way, the value is a
// powerful key that must stay server-side: SUPABASE_URL and both key env
// vars are intentionally NOT prefixed with NEXT_PUBLIC_, since that prefix
// is what tells Next.js to inline a value into the client bundle.

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Set both in .env.local (server-side only, no NEXT_PUBLIC_ prefix). SUPABASE_SECRET_KEY comes from Project Settings > API Keys > Secret keys in the Supabase dashboard.'
    );
  }

  _client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
