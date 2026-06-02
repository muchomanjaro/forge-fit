import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Create a Supabase server client for API route handlers.
 * Uses the cookie store from next/headers for SSR auth sessions.
 */
export async function createRouteClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return await cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Called from a Server Component — ignore
            }
          });
        },
      },
    }
  );
}

/**
 * Get the authenticated user from the current session.
 * Returns null if not authenticated.
 */
export async function getAuthUser() {
  const supabase = await createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Require authentication — returns the user or throws a 401 response.
 * To be used at the top of authenticated route handlers.
 */
export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    throw { status: 401, error: 'Authentication required' };
  }
  return user;
}
