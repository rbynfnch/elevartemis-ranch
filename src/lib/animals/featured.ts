import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { cardFromRow } from "@/lib/animals/cards";
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

  return (data ?? []).map(cardFromRow);
}
