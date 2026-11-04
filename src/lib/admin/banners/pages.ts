import { speciesTerms, type Species } from "@/lib/domain/species";

export type BannerPage = { key: string; label: string };

const speciesKey = (s: Species) => speciesTerms[s].path; // "horses" | "cattle"

/**
 * The pages that have a banner the owner can set, in the order the owner sees them. A species' pages are
 * offered only when the ranch has that species. Category pages are added from the ranch's own categories.
 */
export function bannerPages(enabled: Species[]): BannerPage[] {
  const pages: BannerPage[] = [{ key: "about", label: "About" }];
  for (const s of enabled) pages.push({ key: speciesKey(s), label: speciesTerms[s].plural });
  pages.push({ key: "for-sale", label: "For Sale" });
  for (const s of enabled) {
    const t = speciesTerms[s];
    pages.push(
      { key: `sold-${speciesKey(s)}`, label: `Sold ${t.plural}` },
      { key: `retired-${speciesKey(s)}`, label: `Retired ${t.plural}` },
      { key: `reference-${speciesKey(s)}`, label: `${t.referenceHeading} (${t.plural})` },
    );
  }
  pages.push(
    { key: "on-the-ranch", label: "Happening on the Ranch (blog)" },
    { key: "breeding", label: "Breeding Services" },
    { key: "in-memory", label: "In Memory" },
    { key: "contact", label: "Contact" },
  );
  return pages;
}

export const categoryBannerKey = (categoryId: string) => `category:${categoryId}`;

export type BannerInput = { headline: string; subheadline: string; mediaId: string | null };

const clean = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);

/** Tidies what the form sent: spaces collapsed, over-long text cut. Blank means "use the page's own title". */
export function tidyBanner(input: BannerInput): {
  headline: string | null;
  subheadline: string | null;
  mediaId: string | null;
} {
  return {
    headline: clean(input.headline, 120) || null,
    subheadline: clean(input.subheadline, 240) || null,
    mediaId: input.mediaId,
  };
}

/** Only these keys can be saved: the main pages, the sold / retired / reference pages, or category:<species>.<key>. */
export const isBannerKey = (key: string) =>
  ["about", "horses", "cattle", "for-sale", "contact", "in-memory", "on-the-ranch", "breeding"].includes(key) ||
  /^(sold|retired|reference)-(horses|cattle)$/.test(key) ||
  /^category:(horse|cattle)\.[a-z0-9_]+$/.test(key);
