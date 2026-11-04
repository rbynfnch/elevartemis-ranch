/** Building sitemap.xml and robots.txt. Pure: the page that calls it supplies the ranch's records. */
export type SitemapEntry = { path: string; lastModified?: string | null; priority?: number };

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function sitemapXml(origin: string, entries: SitemapEntry[]): string {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const e of entries) {
    if (seen.has(e.path)) continue;
    seen.add(e.path);
    const parts = [`<loc>${escapeXml(origin + e.path)}</loc>`];
    if (e.lastModified) {
      const d = new Date(e.lastModified);
      if (!Number.isNaN(d.getTime())) parts.push(`<lastmod>${d.toISOString().slice(0, 10)}</lastmod>`);
    }
    if (e.priority !== undefined) parts.push(`<priority>${e.priority.toFixed(1)}</priority>`);
    rows.push(`  <url>${parts.join("")}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

/** Search engines are told to stay out until the ranch has gone live and turned indexing on. */
export function robotsTxt(origin: string, indexable: boolean): string {
  if (!indexable) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`;
}
