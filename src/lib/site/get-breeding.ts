import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import { breedingDisplay, type BreedingDisplay, type BreedingRow } from "@/lib/animals/breeding";
import type { Species } from "@/lib/domain/species";
import { speciesTerms } from "@/lib/domain/species";

export type BreedingAnimal = {
  id: string;
  name: string;
  species: Species;
  href: string;
  breed: string | null;
  birthYear: number | null;
  photo: { src: string; alt: string; focalX: number; focalY: number } | null;
  display: BreedingDisplay;
};

/** Every public sire currently offered, with what the owner chose to say about the service. */
export async function getBreedingAnimals(ranchId: string, slug: string): Promise<BreedingAnimal[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.animals(slug));
  const db = createPublicClient();
  const { data: cards, error } = await db
    .from("public_breeding_services")
    .select("*")
    .eq("ranch_id", ranchId)
    .order("name")
    .limit(100);
  if (error) throw new Error(`Loading breeding services failed: ${error.message}`);
  const ids = (cards ?? []).map((c) => c.animal_id).filter((id): id is string => Boolean(id));
  if (!ids.length) return [];
  const { data: rows } = await db.from("breeding_services").select("*").in("animal_id", ids);
  const byAnimal = new Map((rows ?? []).map((r) => [r.animal_id, r as unknown as BreedingRow]));

  const out: BreedingAnimal[] = [];
  for (const c of cards ?? []) {
    if (!c.animal_id || !c.name || !c.slug || !c.species) continue;
    const display = breedingDisplay(c.species, true, byAnimal.get(c.animal_id) ?? null);
    if (!display) continue;
    const v = pickVariant(c.photo_variants, 960);
    out.push({
      id: c.animal_id,
      name: c.name,
      species: c.species,
      href: `/${speciesTerms[c.species].path}/${c.slug}`,
      breed: c.breed,
      birthYear: c.birth_year,
      photo: v
        ? {
            src: mediaUrl(v.path),
            alt: c.photo_alt ?? c.name,
            focalX: Number(c.photo_focal_x ?? 0.5),
            focalY: Number(c.photo_focal_y ?? 0.5),
          }
        : null,
      display,
    });
  }
  return out;
}
