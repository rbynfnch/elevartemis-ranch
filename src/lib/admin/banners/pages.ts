/** The pages that have a banner the owner can set. Category pages are added from the ranch's own categories. */
export const bannerPages = [
  { key: "about", label: "About", note: "Headline, subheadline and photo." },
  { key: "horses", label: "Horses", note: "Headline, subheadline and photo." },
  { key: "cattle", label: "Cattle", note: "Headline, subheadline and photo." },
  { key: "for-sale", label: "For Sale", note: "Headline, subheadline and photo." },
  { key: "contact", label: "Contact", note: "Headline, subheadline and photo." },
] as const;

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

/** Only these keys can be saved: the five pages, or category:<species>.<key>. */
export const isBannerKey = (key: string) =>
  bannerPages.some((p) => p.key === key) || /^category:(horse|cattle)\.[a-z0-9_]+$/.test(key);
