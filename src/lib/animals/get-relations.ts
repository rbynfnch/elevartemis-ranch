import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { speciesTerms, type Species } from "@/lib/domain/species";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import { buildPedigree, toNodes, type Pedigree, type PedigreeNode } from "@/lib/animals/pedigree";
import type { AnimalCardData } from "@/components/animals/animal-card";

/** Up to three generations of ancestors. Visibility (and who gets a link) is decided inside the database. */
export async function getPedigreeFor(animalId: string, ranchSlug: string): Promise<Pedigree> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(ranchSlug), cacheTags.animals(ranchSlug));

  const { data, error } = await createPublicClient().rpc("get_pedigree", { p_animal: animalId, p_generations: 6 });
  if (error) throw new Error(`Loading the pedigree failed: ${error.message}`);
  return buildPedigree(toNodes(data ?? []));
}

export type OffspringYear = { year: number | null; animals: (AnimalCardData & { parent: string | null })[] };

/** The animal's public offspring, newest year first, each with the other parent. */
export async function getOffspringFor(animalId: string, ranchSlug: string, species: Species): Promise<OffspringYear[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(ranchSlug), cacheTags.animals(ranchSlug));

  const { data, error } = await createPublicClient().rpc("get_offspring", { p_animal: animalId });
  if (error) throw new Error(`Loading offspring failed: ${error.message}`);

  const years = new Map<number | null, OffspringYear["animals"]>();
  for (const o of data ?? []) {
    if (!o.is_linkable || !o.slug) continue;
    const variant = pickVariant(o.photo_variants, 640);
    const year = o.birth_year ?? null;
    years.set(year, [
      ...(years.get(year) ?? []),
      {
        name: o.name,
        href: `/${speciesTerms[species].path}/${o.slug}`,
        categoryLabel: o.category_label ?? "",
        birthYear: o.birth_year,
        parent: o.other_parent_name ? `${o.parent_role === "sire" ? "Out of" : "By"} ${o.other_parent_name}` : null,
        photo: variant
          ? {
              src: mediaUrl(variant.path),
              alt: o.photo_alt ?? o.name,
              focalX: Number(o.photo_focal_x ?? 0.5),
              focalY: Number(o.photo_focal_y ?? 0.5),
            }
          : null,
      },
    ]);
  }
  return [...years.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([year, animals]) => ({ year, animals }));
}

export const hasAncestors = (p: Pedigree) => p.ancestors.size > 0;
export type { PedigreeNode };
