import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { photoFromMedia, type PageBanner } from "./get-banner";

export type GalleryItem = NonNullable<PageBanner["photo"]>;

/** The photos the ranch chose for its gallery, in its order. */
export async function getGallery(ranchId: string, slug: string): Promise<GalleryItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.gallery(slug));
  const { data, error } = await createPublicClient()
    .from("media")
    .select("variants, alt_text, focal_x, focal_y, status, gallery_sort")
    .eq("ranch_id", ranchId)
    .eq("in_gallery", true)
    .eq("status", "ready")
    .order("gallery_sort")
    .limit(200);
  if (error) throw new Error(`Loading the gallery failed: ${error.message}`);
  return (data ?? []).map((m) => photoFromMedia(m)).filter((p): p is GalleryItem => Boolean(p));
}
