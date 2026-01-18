import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // IMPORTANT: must pass a response into the Supabase client so it can set cookies.
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Supabase may refresh the session and request cookie updates:
          // apply those updates to our response.
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  /**
   * Refresh session cookies if needed.
   * getUser() is fine here because we’re scoping middleware to protected routes only.
   */
  await supabase.auth.getUser();

  return res;
}

/**
 * ✅ Only run on protected routes.
 * This avoids “auth refresh on every request” which caused your stalls/loading loops.
 */
export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/home/:path*', '/account/:path*'],
};
