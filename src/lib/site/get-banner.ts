import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { mediaUrl, parseVariants, srcSet } from "@/lib/media/variants";
import type { HeroSlideData } from "./get-home";

export type PageBanner = {
  headline: string | null;
  subheadline: string | null;
  photo: HeroSlideData["photo"];
};

/** The banner the owner set for one page (see page_banners), or null when they haven't set any. */
export async function getPageBanner(ranchId: string, slug: string, pageKey: string): Promise<PageBanner | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.pages(slug));

  const { data, error } = await createPublicClient()
    .from("page_banners")
    .select(
      `headline, subheadline,
       media:media!page_banners_ranch_id_media_id_fkey ( variants, alt_text, focal_x, focal_y, status )`,
    )
    .eq("ranch_id", ranchId)
    .eq("page_key", pageKey)
    .maybeSingle();
  // Before the page_banners migration is applied there is simply no banner.
  if (error) return null;
  if (!data) return null;
  const media = data.media && data.media.status === "ready" ? data.media : null;
  const largest = media ? parseVariants(media.variants).at(-1) : undefined;
  return {
    headline: data.headline,
    subheadline: data.subheadline,
    photo:
      media && largest
        ? {
            src: mediaUrl(largest.path),
            srcSet: srcSet(media.variants),
            alt: media.alt_text ?? "",
            focalX: Number(media.focal_x),
            focalY: Number(media.focal_y),
          }
        : null,
  };
}
