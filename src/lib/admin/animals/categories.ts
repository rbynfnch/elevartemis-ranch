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

/** This ranch's breed list, for the Breed dropdown on the animal form. */
export async function loadBreeds(db: Db, ranchId: string): Promise<{ species: "horse" | "cattle"; name: string }[]> {
  const { data, error } = await db
    .from("ranch_breeds")
    .select("species, name")
    .eq("ranch_id", ranchId)
    .eq("hidden", false)
    .limit(2000);
  if (error) console.error("[breeds] loading the breed dropdown failed:", error);
  return (data ?? []).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

const defaultFactLabels = {
  horse: ["Height", "Discipline", "Performance record", "Earnings", "Offspring earnings", "Temperament", "Training"],
  cattle: ["Ear tag", "Tattoo", "Polled or horned", "Frame score", "Disposition", "Calving ease"],
} as const;

/**
 * Quick Facts labels to suggest: every label this ranch has already used (most
 * used first), then the platform's starter labels. Typing a new label adds it;
 * from then on it is suggested on every animal.
 */
export async function loadFactLabels(db: Db, ranchId: string, species: "horse" | "cattle"): Promise<string[]> {
  const { data } = await db.from("animal_facts").select("label").eq("ranch_id", ranchId).limit(2000);
  const counts = new Map<string, number>();
  for (const { label } of data ?? []) counts.set(label, (counts.get(label) ?? 0) + 1);
  const used = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([label]) => label);
  const seen = new Set(used.map((l) => l.toLowerCase()));
  return [...used, ...defaultFactLabels[species].filter((l) => !seen.has(l.toLowerCase()))];
}
