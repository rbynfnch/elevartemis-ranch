/**
 * Supabase API keys come in two styles:
 *   - legacy JWT keys (`eyJ…`, three dot-separated parts), valid as a Bearer token
 *   - new keys (`sb_publishable_…`, `sb_secret_…`), which are NOT JWTs
 *
 * New keys belong only in the `apikey` header. supabase-js falls back to
 * sending the key as `Authorization: Bearer <key>` when there is no user
 * session; a gateway that does not translate it hands PostgREST a non-JWT and
 * fails with `PGRST301 "Expected 3 parts in JWT; got 1"` (seen with the local
 * CLI). Stripping that header makes both key styles work everywhere.
 */
export function isJwtKey(key: string): boolean {
  return key.split(".").length === 3;
}

/**
 * Wraps `fetch` so a non-JWT API key is never sent as the Bearer token.
 * A real user access token (a JWT) is left untouched.
 */
export function keyAwareFetch(apiKey: string, base: typeof fetch = (...args) => fetch(...args)): typeof fetch {
  if (isJwtKey(apiKey)) return base;
  const bearer = `Bearer ${apiKey}`;
  return async (input, init) => {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (headers.get("Authorization") === bearer) headers.delete("Authorization");
    if (!headers.has("apikey")) headers.set("apikey", apiKey);
    return base(input, { ...init, headers });
  };
}
