import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { speciesTerms } from "@/lib/domain/species";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import type { AnimalCardData } from "@/components/animals/animal-card";

/** Featured animals for the homepage (Phase 8 splits these into sections). */
export async function getFeaturedAnimals(ranchId: string, ranchSlug: string): Promise<AnimalCardData[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(ranchSlug), cacheTags.animals(ranchSlug));

  const { data, error } = await createPublicClient()
    .from("public_animal_cards")
    .select("*")
    .eq("ranch_id", ranchId)
    .eq("is_featured", true)
    .or("on_category_page.eq.true,on_for_sale_page.eq.true")
    .order("species")
    .order("display_order")
    .limit(8);
  if (error) throw new Error(`Loading featured animals failed: ${error.message}`);

  return (data ?? []).map((a) => {
    const variant = pickVariant(a.photo_variants, 960);
    return {
      name: a.name!,
      href: `/${speciesTerms[a.species!].path}/${a.slug}`,
      categoryLabel: a.category_label!,
      breed: a.breed,
      birthYear: a.birth_year,
      badge: a.sale_status === "available" ? "For Sale" : a.sale_status === "pending" ? "Sale Pending" : null,
      photo: variant
        ? {
            src: mediaUrl(variant.path),
            alt: a.photo_alt ?? a.name!,
            focalX: Number(a.photo_focal_x ?? 0.5),
            focalY: Number(a.photo_focal_y ?? 0.5),
          }
        : null,
    };
  });
}
