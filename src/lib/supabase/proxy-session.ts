import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Refreshes the admin's Supabase session inside the proxy so Server
 * Components see a valid token. `makeResponse` rebuilds the (rewrite)
 * response after cookies change, as @supabase/ssr requires.
 *
 * This is NOT authorization: every admin page and Server Action re-checks the
 * user server-side, and RLS enforces access in the database.
 */
export async function refreshAdminSession(
  request: NextRequest,
  makeResponse: () => NextResponse,
): Promise<NextResponse> {
  const env = publicEnv();
  let response = makeResponse();
  const supabase = createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = makeResponse();
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}
