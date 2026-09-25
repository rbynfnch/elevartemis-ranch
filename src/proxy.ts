import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { adminShortcutPath, hostPort, normalizeHost } from "@/lib/tenant/host";
import { resolveHost } from "@/lib/tenant/resolve-host";
import { refreshAdminSession } from "@/lib/supabase/proxy-session";

/**
 * Multi-ranch routing.
 *
 *   admin host (NEXT_PUBLIC_ADMIN_HOST)  → /manage/…        (session refreshed)
 *   ranch domain /admin/…                → redirect to the admin host
 *   ranch domain, non-primary (www.)     → 308 to the primary hostname
 *   ranch domain                         → /site/{ranchSlug}/…
 *   unknown host                         → 404 (or DEFAULT_RANCH_SLUG outside production)
 *
 * Route folders are never reachable directly: a request for /site/x on a ranch
 * domain is rewritten to /site/{slug}/site/x, which doesn't exist.
 */
export async function proxy(request: NextRequest) {
  const env = publicEnv();
  const rawHost = request.headers.get("host");
  const host = normalizeHost(rawHost);
  const url = request.nextUrl;
  const port = hostPort(rawHost);

  if (host === normalizeHost(env.adminHost)) {
    const target = url.clone();
    target.pathname = `/manage${url.pathname === "/" ? "" : url.pathname}`;
    return refreshAdminSession(request, () => NextResponse.rewrite(target, { request }));
  }

  const adminPath = adminShortcutPath(url.pathname);
  if (adminPath !== null) {
    return NextResponse.redirect(`${url.protocol}//${env.adminHost}${adminPath}${url.search}`, 307);
  }

  let ranch: Awaited<ReturnType<typeof resolveHost>>;
  try {
    ranch = await resolveHost(host);
  } catch (error) {
    console.error("[proxy] host resolution failed", error);
    return new NextResponse("The site is temporarily unavailable. Please try again in a minute.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "retry-after": "60", "cache-control": "no-store" },
    });
  }
  if (!ranch) {
    return new NextResponse("This site isn't available.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=60" },
    });
  }

  if (!ranch.viaFallback && !ranch.isPrimary && ranch.primaryHostname) {
    const origin = `${url.protocol}//${ranch.primaryHostname}${port ? `:${port}` : ""}`;
    return NextResponse.redirect(`${origin}${url.pathname}${url.search}`, 308);
  }

  const target = url.clone();
  target.pathname = `/site/${ranch.ranchSlug}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(target);
}

export const config = {
  matcher: [
    // Everything except Next internals, API routes (they read the Host header
    // themselves) and static assets. sitemap.xml / robots.txt DO pass through.
    "/((?!_next/static|_next/image|api/|favicon\\.ico|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|map|woff2?)$).*)",
  ],
};
