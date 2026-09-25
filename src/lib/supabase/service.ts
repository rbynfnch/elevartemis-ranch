import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";

/**
 * Service-role client: BYPASSES Row-Level Security.
 *
 * Only for narrowly scoped server tasks that cannot run as the user:
 *   - reading a ranch's private inquiry email in the contact handler
 *   - writing processed image variants
 *   - provisioning scripts
 * Always filter by ranch_id explicitly when using it.
 */
export function createServiceSupabase() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient<Database>(publicEnv().supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
