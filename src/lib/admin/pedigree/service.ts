/**
 * Building a pedigree: choosing an animal's sire and dam, adding an ancestor the
 * ranch doesn't own, and reading the tree back. Plain functions over the owner's
 * Supabase client, so RLS applies. The database enforces the rules (a sire isn't
 * female, a dam is, parents are the same species, nobody is their own ancestor)
 * and its messages are shown as they are.
 */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import { textToDoc } from "@/lib/admin/form-values";
import type { Species } from "@/lib/domain/species";
import type { Db, Result } from "@/lib/admin/animals/service";
import { toNodes, type PedigreeNode } from "@/lib/animals/pedigree";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type Role = "sire" | "dam";

export type ParentCandidate = {
  id: string;
  name: string;
  /** False for an ancestor the ranch only recorded for a pedigree. */
  owned: boolean;
  detail: string;
};

/** The animal's pedigree for the builder: three generations, every ancestor, no matter who may view them. */
export async function loadPedigree(db: Db, animalId: string): Promise<Result<PedigreeNode[]>> {
  const { data, error } = await db.rpc("get_pedigree", { p_animal: animalId, p_generations: 3 });
  if (error) return fail(dbErrorMessage(error));
  return ok(toNodes(data ?? []));
}

/** Animals that could be this animal's sire or dam: same species, the right sex, found by name. */
export async function searchParents(
  db: Db,
  ranchId: string,
  query: { species: Species; role: Role; q: string; excludeId: string },
): Promise<Result<ParentCandidate[]>> {
  let request = db
    .from("animals")
    .select("id, name, record_scope, breed, birth_year, registry, registration_number")
    .eq("ranch_id", ranchId)
    .eq("species", query.species)
    .is("archived_at", null)
    .neq("id", query.excludeId)
    .order("name")
    .limit(25);
  // A dam must be female; a sire may be anything but female (he might have been gelded later).
  request = query.role === "dam" ? request.eq("sex", "female") : request.neq("sex", "female");
  const q = query.q.trim().replace(/[%_\\,()]/g, "");
  if (q) request = request.ilike("name", `%${q}%`);
  const { data, error } = await request;
  if (error) return fail(dbErrorMessage(error));
  return ok(
    data.map((a) => ({
      id: a.id,
      name: a.name,
      owned: a.record_scope === "inventory",
      detail: [
        a.registration_number ? `${a.registry ? `${a.registry} ` : ""}#${a.registration_number}` : null,
        a.breed,
        a.birth_year,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  );
}

export type OutsideAncestorInput = {
  name: string;
  registry?: string | null;
  registrationNumber?: string | null;
  birthYear?: number | null;
  color?: string | null;
  breed?: string | null;
  notes?: string | null;
};

/** Records an ancestor the ranch doesn't own, for the pedigree only. It never appears on the website as an animal. */
export async function addOutsideAncestor(
  db: Db,
  ranchId: string,
  species: Species,
  role: Role,
  input: OutsideAncestorInput,
): Promise<Result<{ id: string; name: string }>> {
  const name = input.name.replace(/\s+/g, " ").trim();
  if (!name) return fail("Enter a name.");
  if (name.length > 120) return fail("Use 120 characters or fewer for the name.");
  const clean = (v: string | null | undefined, max: number) => {
    const t = v?.trim();
    return t ? t.slice(0, max) : null;
  };
  const year =
    input.birthYear && input.birthYear >= 1800 && input.birthYear <= new Date().getFullYear() ? input.birthYear : null;

  const { data, error } = await db
    .from("animals")
    .insert({
      ranch_id: ranchId,
      species,
      record_scope: "pedigree_only",
      name,
      slug: "",
      sex: role === "sire" ? "male" : "female",
      registry: clean(input.registry, 80),
      registration_number: clean(input.registrationNumber, 60),
      birth_date: year ? `${year}-01-01` : null,
      birth_precision: "year",
      color: clean(input.color, 80),
      breed: clean(input.breed, 80),
      description: textToDoc(input.notes ?? null) as Json | null,
    })
    .select("id, name")
    .single();
  if (error) return fail(dbErrorMessage(error));
  return ok(data);
}

/** Sets (or, with null, clears) one parent. The database refuses anything that doesn't make sense. */
export async function setParent(db: Db, childId: string, role: Role, parentId: string | null): Promise<Result> {
  const { data, error } = await db
    .from("animals")
    .update(role === "sire" ? { sire_id: parentId } : { dam_id: parentId })
    .eq("id", childId)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail("That animal could not be found. Refresh the page and try again.");
  return ok(null);
}
