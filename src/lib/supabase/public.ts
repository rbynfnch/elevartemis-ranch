import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";

/**
 * Anonymous, cookie-free client for PUBLIC website reads.
 *
 * Safe to call inside `'use cache'` functions: it carries no user session, so
 * RLS returns exactly what any visitor may see and the result can be shared.
 */
export function createPublicClient() {
  const env = publicEnv();
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
