import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Server Component safe Supabase client (SSR cookie model).
 *
 * - Reads cookies via getAll()
 * - Attempts to write cookies via setAll()
 *   - In Server Components, cookie mutation may throw
 *   - We swallow that error because middleware/route-handlers do the real refresh writes
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...options });
            });
          } catch {
            // Server Components can’t always set cookies.
            // Middleware / Route Handlers will handle session refresh + cookie writes.
          }
        },
      },
    }
  );
}
