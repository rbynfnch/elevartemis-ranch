import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { getListing } from "@/lib/animals/listings";
import { lifespanText } from "@/lib/animals/portfolio";
import type { ListingCard } from "@/lib/animals/cards";

/**
 * The animals on the In Memory page: published animals marked "In Memory",
 * each with a lifespan line built from what the owner entered. The view that
 * lists animals doesn't carry the passing date, so it is read from the animals
 * themselves (visitors may read the same published rows).
 */
export async function getMemorial(ranchId: string, ranchSlug: string): Promise<ListingCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(ranchSlug), cacheTags.animals(ranchSlug));

  const cards = await getListing(ranchId, ranchSlug, { kind: "memorial" });
  if (cards.length === 0) return cards;

  // Cards are keyed by their web address; look the dates up by the same address.
  const slugs = cards.map((c) => c.href.split("/").pop()!);
  const { data, error } = await createPublicClient()
    .from("animals")
    .select("slug, deceased_on, deceased_precision")
    .eq("ranch_id", ranchId)
    .in("slug", slugs);
  if (error) throw new Error(`Loading the In Memory page failed: ${error.message}`);

  const dates = new Map((data ?? []).map((a) => [a.slug, a]));
  return cards.map((card) => {
    const d = dates.get(card.href.split("/").pop()!);
    return { ...card, memorial: lifespanText(card.birthYear, d?.deceased_on ?? null, d?.deceased_precision ?? "year") };
  });
}
