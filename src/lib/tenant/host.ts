/**
 * Normalises a Host header or configured host: lowercase, no port, no
 * trailing dot. Returns "" for missing input.
 *   "Demo.LocalHost:3000" → "demo.localhost"
 */
export function normalizeHost(raw: string | null | undefined): string {
  if (!raw) return "";
  let host = raw.trim().toLowerCase();
  if (host.startsWith("[")) {
    // IPv6 literal, e.g. "[::1]:3000"
    const end = host.indexOf("]");
    return end > 0 ? host.slice(0, end + 1) : host;
  }
  const colon = host.indexOf(":");
  if (colon !== -1) host = host.slice(0, colon);
  return host.replace(/\.$/, "");
}

/** Port from a Host header, if any ("demo.localhost:3000" → "3000"). */
export function hostPort(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const match = /:(\d+)$/.exec(raw.trim());
  return match?.[1];
}

/** "/admin" and "/admin/…" on a ranch domain are shortcuts to the admin host. */
export function adminShortcutPath(pathname: string): string | null {
  if (pathname === "/admin" || pathname === "/admin/") return "/";
  if (pathname.startsWith("/admin/")) return pathname.slice("/admin".length);
  return null;
}

/**
 * Hosts allowed to fall back to DEFAULT_RANCH_SLUG: local development and
 * Vercel preview URLs only. A stray production domain pointed at the app
 * must never render a ranch, even if an environment variable is misconfigured.
 */
export function isFallbackEligibleHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost") ||
    host.endsWith(".vercel.app")
  );
}
