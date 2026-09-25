import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";

/**
 * Per-request client carrying the signed-in user's session (admin area).
 * RLS scopes every query to the ranches this user belongs to.
 * Never use inside `'use cache'`.
 */
export async function createServerSupabase() {
  const env = publicEnv();
  const store = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session on every admin request, so this is safe.
        }
      },
    },
  });
}
