import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import type { Species } from "@/lib/domain/species";
import { cardFromRow, type ListingCard } from "@/lib/animals/cards";

export type ListingKind = "category" | "overview" | "for_sale" | "sold" | "retired" | "reference" | "memorial";

const flag: Record<Exclude<ListingKind, "category" | "overview">, string> = {
  for_sale: "on_for_sale_page",
  sold: "on_sold_page",
  retired: "on_retired_page",
  reference: "on_reference_page",
  memorial: "on_memorial_page",
};

/**
 * The public animals for one listing page, in the owner's order. Row-Level
 * Security and the view's own flags decide what appears: published animals only,
 * sold ones only on the Sold page, deceased ones only under In Memory.
 */
export async function getListing(
  ranchId: string,
  ranchSlug: string,
  query: { kind: ListingKind; species?: Species; categoryId?: string },
): Promise<ListingCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(ranchSlug), cacheTags.animals(ranchSlug));

  let request = createPublicClient().from("public_animal_cards").select("*").eq("ranch_id", ranchId);
  if (query.species) request = request.eq("species", query.species);
  if (query.kind === "category" || query.kind === "overview") request = request.eq("on_category_page", true);
  else request = request.eq(flag[query.kind], true);
  if (query.kind === "category" && query.categoryId) request = request.eq("category_id", query.categoryId);

  const { data, error } = await request.order("species").order("display_order").order("name").limit(500);
  if (error) throw new Error(`Loading the animal list failed: ${error.message}`);
  return (data ?? []).map(cardFromRow);
}
