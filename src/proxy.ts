import { NextResponse, type NextRequest } from "next/server";
import { adminSubpath, hostPort, normalizeHost } from "@/lib/tenant/host";
import { resolveHost } from "@/lib/tenant/resolve-host";
import { refreshAdminSession } from "@/lib/supabase/proxy-session";

/**
 * Multi-ranch routing.
 *
 *   ranch domain, non-primary (www.)     → 308 to the primary hostname
 *   ranch domain /admin/…                → /admin/{ranchSlug}/…  (session refreshed,
 *                                           signed-out visitors sent to /admin/login)
 *   ranch domain, anything else          → /site/{ranchSlug}/…
 *   unknown host                         → 404 (or DEFAULT_RANCH_SLUG outside production)
 *
 * Route folders are never reachable directly: a request for /site/x on a ranch
 * domain is rewritten to /site/{slug}/site/x, which doesn't exist.
 */
export async function proxy(request: NextRequest) {
  const rawHost = request.headers.get("host");
  const host = normalizeHost(rawHost);
  const url = request.nextUrl;
  const port = hostPort(rawHost);

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

  const adminPath = adminSubpath(url.pathname);
  if (adminPath !== null) {
    const target = url.clone();
    target.pathname = `/admin/${ranch.ranchSlug}${adminPath}`;
    const { response, signedIn } = await refreshAdminSession(request, () => NextResponse.rewrite(target, { request }));
    if (!signedIn && !isPublicAdminPath(url.pathname)) {
      // Build the redirect from the Host the visitor used, never the internal URL.
      const next = adminPath === "" ? "" : `?next=${encodeURIComponent(url.pathname + url.search)}`;
      const redirect = NextResponse.redirect(`${url.protocol}//${rawHost}/admin/login${next}`);
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      return redirect;
    }
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const target = url.clone();
  target.pathname = `/site/${ranch.ranchSlug}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(target);
}

/** Admin pages reachable without a session. */
const publicAdminPaths = ["/admin/login", "/admin/login/verify", "/admin/forgot-password", "/admin/auth/confirm"];
function isPublicAdminPath(pathname: string) {
  return publicAdminPaths.some((p) => pathname === p || pathname === `${p}/`);
}

export const config = {
  matcher: [
    // Everything except Next internals, API routes (they read the Host header
    // themselves) and static assets. sitemap.xml / robots.txt DO pass through.
    "/((?!_next/static|_next/image|api/|favicon\\.ico|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|map|woff2?)$).*)",
  ],
};
