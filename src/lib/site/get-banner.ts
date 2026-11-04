import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { mediaUrl, parseVariants, srcSet } from "@/lib/media/variants";
import type { HeroSlideData } from "./get-home";

type MediaRow = { variants: unknown; alt_text: string | null; focal_x: number; focal_y: number; status: string };

/** A ready photo as the hero banner and About page use it, or null when it isn't ready. */
export function photoFromMedia(media: MediaRow | null | undefined): HeroSlideData["photo"] {
  if (!media || media.status !== "ready") return null;
  const largest = parseVariants(media.variants).at(-1);
  if (!largest) return null;
  return {
    src: mediaUrl(largest.path),
    srcSet: srcSet(media.variants),
    alt: media.alt_text ?? "",
    focalX: Number(media.focal_x),
    focalY: Number(media.focal_y),
  };
}

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
  return {
    headline: data.headline,
    subheadline: data.subheadline,
    photo: photoFromMedia(data.media),
  };
}
