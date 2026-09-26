import type { Db } from "./service";
import { ranchCategories } from "@/lib/site/navigation";
import type { CategoryRow, SpeciesSettings } from "@/lib/site/get-site";
import type { CategoryOption } from "@/components/admin/animals/basics-form";

/** The categories this ranch offers, in its order (e.g. Bulls, Yearlings, Cows for its Herefords). */
export async function loadRanchCategories(db: Db, ranchId: string): Promise<CategoryOption[]> {
  const [cats, settings] = await Promise.all([
    db
      .from("animal_categories")
      .select(
        "id, species, key, label_singular, label_plural, path_segment, groups_by_birth_year, sort_order, allowed_sexes",
      ),
    db.from("ranch_species_settings").select("species, categories").eq("ranch_id", ranchId),
  ]);
  const rows = (cats.data ?? []) as (CategoryRow & { allowed_sexes: string[] })[];
  const out: CategoryOption[] = [];
  for (const species of ["horse", "cattle"] as const) {
    const s = settings.data?.find((x) => x.species === species);
    const ordered = ranchCategories(species, rows, s ? ({ categories: s.categories } as SpeciesSettings) : undefined);
    for (const c of ordered) {
      const full = rows.find((r) => r.id === c.id)!;
      out.push({ id: c.id, species, label: c.label_singular, allowedSexes: full.allowed_sexes });
    }
  }
  return out;
}

/** Breeds already used on this ranch, to suggest while typing. */
export async function loadBreedSuggestions(db: Db, ranchId: string): Promise<string[]> {
  const { data } = await db.from("animals").select("breed").eq("ranch_id", ranchId).not("breed", "is", null);
  const defaults = ["Quarter Horse", "Appaloosa", "Hereford"];
  return [...new Set([...(data ?? []).map((r) => r.breed!).filter(Boolean), ...defaults])].sort();
}
