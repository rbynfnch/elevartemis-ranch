import { getSiteSettings } from "@/lib/site/get-site";
import { robotsTxt } from "@/lib/site/sitemap";

/** Search engines may look only once the ranch has gone live and indexing is on. */
export async function GET(request: Request, ctx: RouteContext<"/site/[ranch]/robots.txt">) {
  const { ranch } = await ctx.params;
  const site = await getSiteSettings(ranch);
  if (!site) return new Response("Not found", { status: 404 });
  const origin = `https://${site.primaryHostname ?? new URL(request.url).host}`;
  const indexable = site.status === "live" && !site.seo.noindex;
  return new Response(robotsTxt(origin, indexable), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
