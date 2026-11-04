import { getSiteSettings } from "@/lib/site/get-site";
import { buildNavigation } from "@/lib/site/navigation";
import { getPosts } from "@/lib/site/get-posts";
import { createPublicClient } from "@/lib/supabase/public";
import { speciesTerms } from "@/lib/domain/species";
import { sitemapXml, type SitemapEntry } from "@/lib/site/sitemap";

/** Every public page the ranch has: the pages in its menu, each animal and each post. */
export async function GET(request: Request, ctx: RouteContext<"/site/[ranch]/sitemap.xml">) {
  const { ranch } = await ctx.params;
  const site = await getSiteSettings(ranch);
  if (!site) return new Response("Not found", { status: 404 });
  const host = new URL(request.url).host;
  const origin = `https://${site.primaryHostname ?? host}`;

  const entries: SitemapEntry[] = [{ path: "/", priority: 1 }];
  const walk = (items: ReturnType<typeof buildNavigation>) => {
    for (const item of items) {
      entries.push({ path: item.href, priority: 0.7 });
      if (item.children) walk(item.children.map((c) => ({ ...c })) as ReturnType<typeof buildNavigation>);
    }
  };
  walk(buildNavigation(site));

  const { data: animals } = await createPublicClient()
    .from("public_animal_cards")
    .select("slug, species, updated_at")
    .eq("ranch_id", site.ranchId)
    .limit(2000);
  for (const a of animals ?? [])
    if (a.slug && a.species)
      entries.push({ path: `/${speciesTerms[a.species].path}/${a.slug}`, lastModified: a.updated_at, priority: 0.6 });

  for (const p of await getPosts(site.ranchId, site.slug))
    entries.push({ path: `/on-the-ranch/${p.slug}`, lastModified: p.publishedAt, priority: 0.5 });

  return new Response(sitemapXml(origin, entries), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
