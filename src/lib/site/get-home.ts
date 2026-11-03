import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { mediaUrl, parseVariants, srcSet } from "@/lib/media/variants";
import type { Species } from "@/lib/domain/species";
import { slideHref } from "./slides";
import type { CategoryRow } from "./get-site";

export type HeroSlideData = {
  id: string;
  headline: string;
  subheadline: string | null;
  cta: { label: string; href: string } | null;
  photo: { src: string; srcSet: string; alt: string; focalX: number; focalY: number } | null;
};

/**
 * Active homepage slides (at most 3), with each button resolved to a real
 * link. A slide with no ready photo still shows its text over the brand
 * colour, so the hero is never blank while a ranch is getting its photos.
 */
export async function getHeroSlides(
  ranchId: string,
  slug: string,
  categories: CategoryRow[],
): Promise<HeroSlideData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.slides(slug), cacheTags.animals(slug));

  const db = createPublicClient();
  const { data, error } = await db
    .from("hero_slides")
    .select(
      `id, headline, subheadline, cta_label, cta_kind, cta_page, cta_category_id, cta_animal_id, cta_url, sort_order,
       media:media!hero_slides_ranch_id_media_id_fkey ( variants, alt_text, focal_x, focal_y, status )`,
    )
    .eq("ranch_id", ranchId)
    .eq("is_active", true)
    .is("archived_at", null)
    .order("sort_order")
    .limit(3);
  if (error) throw new Error(`Loading homepage slides failed: ${error.message}`);

  const animalIds = [...new Set((data ?? []).map((s) => s.cta_animal_id).filter((id): id is string => Boolean(id)))];
  const animals = new Map<string, { species: Species; slug: string }>();
  if (animalIds.length > 0) {
    const { data: rows, error: animalError } = await db
      .from("public_animal_cards")
      .select("id, species, slug")
      .eq("ranch_id", ranchId)
      .in("id", animalIds);
    if (animalError) throw new Error(`Loading slide links failed: ${animalError.message}`);
    for (const r of rows ?? [])
      if (r.id && r.species && r.slug) animals.set(r.id, { species: r.species, slug: r.slug });
  }

  return (data ?? []).map((s) => {
    const media = s.media && s.media.status === "ready" ? s.media : null;
    const variants = media ? parseVariants(media.variants) : [];
    const largest = variants[variants.length - 1];
    const href = slideHref(
      { kind: s.cta_kind, page: s.cta_page, categoryId: s.cta_category_id, url: s.cta_url },
      { categories, animal: s.cta_animal_id ? (animals.get(s.cta_animal_id) ?? null) : null },
    );
    return {
      id: s.id,
      headline: s.headline,
      subheadline: s.subheadline,
      cta: href && s.cta_label ? { label: s.cta_label, href } : null,
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
  });
}
