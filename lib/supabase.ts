// lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrlEnv) {
  throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKeyEnv) {
  throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// ✅ Narrowed types for TS (now guaranteed to be strings)
const supabaseUrl: string = supabaseUrlEnv;
const supabaseAnonKey: string = supabaseAnonKeyEnv;

/**
 * Browser/client Supabase instance (anon key).
 * Use this in client components.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Server-only Supabase client creator.
 * IMPORTANT:
 * - Do NOT import/call this from client components.
 * - Only call it from Route Handlers / Server Actions.
 */
export function createServerSupabaseClient(serviceRoleKey: string): SupabaseClient {
  if (!serviceRoleKey) {
    throw new Error('Missing service role key for server Supabase client.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
