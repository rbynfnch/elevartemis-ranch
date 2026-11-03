"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";
import { keyAwareFetch } from "@/lib/supabase/api-key";

/** Browser client for admin-side interactions such as direct photo uploads. */
export function createBrowserSupabase() {
  const env = publicEnv();
  return createBrowserClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    global: { fetch: keyAwareFetch(env.supabasePublishableKey) },
  });
}
