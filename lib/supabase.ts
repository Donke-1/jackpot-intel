// lib/supabase.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
if (!supabaseKey)
  throw new Error(
    'Missing env: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
  );

/**
 * Browser/client Supabase instance (cookie-based SSR setup via @supabase/ssr).
 * Use ONLY in Client Components.
 */
export const supabase: SupabaseClient = createBrowserClient(
  supabaseUrl,
  supabaseKey
);
