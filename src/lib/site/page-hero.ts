import type { SiteSettings } from "./get-site";
import { getPageBanner, type PageBanner } from "./get-banner";
import { getHeroSlides } from "./get-home";

export type PageHeroData = { title: string; subtitle: string | null; photo: PageBanner["photo"] };

/**
 * What a page's hero banner shows: the owner's headline, subheadline and photo for that page, and
 * where they haven't set one, the page's own title, the given subtitle and one of the ranch's
 * homepage photographs. A banner is never blank and never a stock picture.
 */
export async function getPageHero(
  site: SiteSettings,
  pageKey: string,
  defaults: { title: string; subtitle?: string | null },
): Promise<PageHeroData> {
  const [banner, slides] = await Promise.all([
    getPageBanner(site.ranchId, site.slug, pageKey),
    getHeroSlides(site.ranchId, site.slug, site.categories),
  ]);
  return {
    title: banner?.headline ?? defaults.title,
    subtitle: banner?.subheadline ?? defaults.subtitle ?? null,
    photo: banner?.photo ?? slides.find((s) => s.photo)?.photo ?? null,
  };
}
