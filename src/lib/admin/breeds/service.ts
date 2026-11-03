/**
 * Breeds: each ranch's own list, per species. Plain functions over the owner's
 * Supabase client, so RLS applies. The database keeps animals and the list in
 * step (see migration 20260928000300), so these only manage the list itself.
 */
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Species } from "@/lib/domain/species";
import type { Db, Result } from "@/lib/admin/animals/service";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type BreedItem = { id: string; species: Species; name: string; animals: number; hidden: boolean };

export type BreedSuggestion = {
  name: string;
  /** Set for a breed the owner removed earlier: add it back by id. */ restoreId: string | null;
};

/**
 * What to offer under the list: breeds the owner removed (add back in one click),
 * then common breeds not in the list. Breeds already listed are never suggested.
 */
export function breedSuggestions(breeds: BreedItem[], starters: string[]): BreedSuggestion[] {
  const known = new Set(breeds.map((b) => b.name.toLowerCase()));
  const removed = breeds.filter((b) => b.hidden).map((b) => ({ name: b.name, restoreId: b.id }));
  const common = starters.filter((s) => !known.has(s.toLowerCase())).map((name) => ({ name, restoreId: null }));
  return [...removed, ...common];
}

/** Common breeds to offer as one-click starters. Suggestions only: nothing is added unless the owner picks it. */
export const starterBreeds: Record<Species, string[]> = {
  horse: ["Quarter Horse", "Appaloosa", "Paint Horse", "Arabian", "Thoroughbred", "Morgan", "Mustang", "Percheron"],
  cattle: ["Hereford", "Angus", "Red Angus", "Charolais", "Simmental", "Limousin", "Shorthorn", "Brahman"],
};

export function cleanBreedName(raw: string): { ok: true; name: string } | { ok: false; message: string } {
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name) return { ok: false, message: "Enter a breed name." };
  if (name.length > 80) return { ok: false, message: "Use 80 characters or fewer." };
  return { ok: true, name };
}

/** The ranch's breeds with how many animals use each. */
export async function listBreeds(db: Db, ranchId: string): Promise<Result<BreedItem[]>> {
  const [breeds, animals] = await Promise.all([
    db.from("ranch_breeds").select("id, species, name, hidden").eq("ranch_id", ranchId).limit(2000),
    db.from("animals").select("species, breed").eq("ranch_id", ranchId).not("breed", "is", null).limit(20000),
  ]);
  if (breeds.error) return fail(dbErrorMessage(breeds.error));
  if (animals.error) return fail(dbErrorMessage(animals.error));

  const counts = new Map<string, number>();
  for (const a of animals.data) {
    const key = `${a.species}:${a.breed!.toLowerCase()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return ok(
    breeds.data
      .map((b) => ({ ...b, animals: counts.get(`${b.species}:${b.name.toLowerCase()}`) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
  );
}

export async function addBreed(
  db: Db,
  ranchId: string,
  species: Species,
  rawName: string,
): Promise<Result<{ id: string; name: string }>> {
  const cleaned = cleanBreedName(rawName);
  if (!cleaned.ok) return fail(cleaned.message);

  // A breed the owner removed earlier comes back instead of being created twice.
  const { data: existing, error: lookupError } = await db
    .from("ranch_breeds")
    .select("id, name, hidden")
    .eq("ranch_id", ranchId)
    .eq("species", species)
    .ilike(
      "name",
      cleaned.name.replace(/[%_\\]/g, (c) => `\\${c}`),
    )
    .maybeSingle();
  if (lookupError) return fail(dbErrorMessage(lookupError));
  if (existing) {
    if (!existing.hidden) return fail("That breed is already in your list.");
    return restoreBreed(db, existing.id);
  }

  const { data, error } = await db
    .from("ranch_breeds")
    .insert({ ranch_id: ranchId, species, name: cleaned.name })
    .select("id, name")
    .single();
  if (error) {
    return error.code === "23505" ? fail("That breed is already in your list.") : fail(dbErrorMessage(error));
  }
  return ok(data);
}

/** Puts a removed breed back in the list. */
export async function restoreBreed(db: Db, id: string): Promise<Result<{ id: string; name: string }>> {
  const { data, error } = await db.from("ranch_breeds").update({ hidden: false }).eq("id", id).select("id, name");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail("That breed could not be found. Refresh the page and try again.");
  return ok(data[0]);
}

/** Renames the breed and every animal that uses it. */
export async function renameBreed(db: Db, id: string, rawName: string): Promise<Result<{ name: string }>> {
  const cleaned = cleanBreedName(rawName);
  if (!cleaned.ok) return fail(cleaned.message);
  const { error } = await db.rpc("rename_breed", { p_breed: id, p_name: cleaned.name });
  if (error) {
    return error.code === "23505" ? fail("Another breed already has that name.") : fail(dbErrorMessage(error));
  }
  return ok({ name: cleaned.name });
}

/**
 * Takes a breed out of the list. It isn't deleted: it moves to the suggestions so it can be added back.
 * The database refuses when animals still use it, and says how many do.
 */
export async function removeBreed(db: Db, ranchId: string, id: string): Promise<Result> {
  const { data, error } = await db
    .from("ranch_breeds")
    .update({ hidden: true })
    .eq("id", id)
    .eq("ranch_id", ranchId)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail("That breed could not be found. Refresh the page and try again.");
  return ok(null);
}
