import { describe, expect, it } from "vitest";
import { robotsTxt, sitemapXml } from "./sitemap";

describe("sitemapXml", () => {
  it("lists each address once, escaped, with dates", () => {
    const xml = sitemapXml("https://fw.example", [
      { path: "/", priority: 1 },
      { path: "/horses/big-red", lastModified: "2026-03-04T10:00:00Z" },
      { path: "/horses/big-red" },
      { path: "/a&b" },
    ]);
    expect(xml.match(/<url>/g)).toHaveLength(3);
    expect(xml).toContain("<loc>https://fw.example/horses/big-red</loc><lastmod>2026-03-04</lastmod>");
    expect(xml).toContain("https://fw.example/a&amp;b");
    expect(xml).toContain("<priority>1.0</priority>");
  });
  it("ignores a bad date", () => {
    expect(sitemapXml("https://x", [{ path: "/", lastModified: "nope" }])).not.toContain("lastmod");
  });
});

describe("robotsTxt", () => {
  it("keeps search engines out until the ranch is live", () => {
    expect(robotsTxt("https://x", false)).toBe("User-agent: *\nDisallow: /\n");
  });
  it("points to the sitemap when live and keeps the admin out", () => {
    const r = robotsTxt("https://x", true);
    expect(r).toContain("Allow: /");
    expect(r).toContain("Disallow: /admin");
    expect(r).toContain("Sitemap: https://x/sitemap.xml");
  });
});
