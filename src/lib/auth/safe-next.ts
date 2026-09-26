/**
 * Post-sign-in destinations must be admin paths on this same site, so a
 * crafted link like /admin/login?next=https://evil.example can't bounce an
 * owner offsite (or onto the public site).
 */
export function safeNext(raw: unknown, fallback = "/admin"): string {
  if (typeof raw !== "string") return fallback;
  const next = raw.trim();
  if (next !== "/admin" && !next.startsWith("/admin/") && !next.startsWith("/admin?")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  // Never send people back into the sign-in flow itself.
  if (/^\/admin\/(login|auth\/confirm)(\/|\?|$)/.test(next)) return fallback;
  return next;
}
