/**
 * Building a pedigree: choosing an animal's sire and dam, adding an ancestor the
 * ranch doesn't own, and reading the tree back. Plain functions over the owner's
 * Supabase client, so RLS applies. The database enforces the rules (a sire isn't
 * female, a dam is, parents are the same species, nobody is their own ancestor)
 * and its messages are shown as they are.
 */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import { docToText } from "@/lib/admin/form-values";
import type { Species } from "@/lib/domain/species";
import type { Db, Result } from "@/lib/admin/animals/service";
import { registrationText, toNodes, type PedigreeNode } from "@/lib/animals/pedigree";
import { ancestorColumns, type AncestorInput } from "./fields";

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
  const nodes = toNodes(data ?? []);

  // The owner can read every record in the ranch, so registration details come straight from the animals.
  // That way they show here even before the database's pedigree function reports them.
  const ids = [...new Set(nodes.map((n) => n.animalId))];
  if (ids.length > 0) {
    const { data: regs } = await db.from("animals").select("id, registry, registration_number").in("id", ids);
    const byId = new Map((regs ?? []).map((r) => [r.id, registrationText(r.registry, r.registration_number)]));
    for (const n of nodes) n.registration = byId.get(n.animalId) ?? n.registration;
  }
  return ok(nodes);
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

export type OutsideAncestorInput = AncestorInput;

/** Records an ancestor the ranch doesn't own, for the pedigree only. It never appears on the website as an animal. */
export async function addOutsideAncestor(
  db: Db,
  ranchId: string,
  species: Species,
  role: Role,
  input: OutsideAncestorInput,
): Promise<Result<{ id: string; name: string }>> {
  const fields = ancestorColumns(input);
  if (!fields.ok) return fail(fields.message);
  const { data, error } = await db
    .from("animals")
    .insert({
      ...fields.columns,
      description: fields.columns.description as Json | null,
      ranch_id: ranchId,
      species,
      record_scope: "pedigree_only",
      slug: "",
      sex: role === "sire" ? "male" : "female",
    })
    .select("id, name")
    .single();
  if (error) return fail(dbErrorMessage(error));
  return ok(data);
}

export type AncestorDetails = {
  id: string;
  name: string;
  registry: string;
  registrationNumber: string;
  birthYear: string;
  color: string;
  height: string;
  notes: string;
};

/** An outside ancestor's details, for the edit form. Animals the ranch owns are edited on their own page. */
export async function getAncestor(db: Db, ranchId: string, id: string): Promise<Result<AncestorDetails>> {
  const { data, error } = await db
    .from("animals")
    .select("id, name, record_scope, registry, registration_number, birth_year, color, height, description")
    .eq("id", id)
    .eq("ranch_id", ranchId)
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("That animal could not be found. Refresh the page and try again.");
  if (data.record_scope !== "pedigree_only") return fail("This animal is one of yours. Edit it on its own page.");
  return ok({
    id: data.id,
    name: data.name,
    registry: data.registry ?? "",
    registrationNumber: data.registration_number ?? "",
    birthYear: data.birth_year ? String(data.birth_year) : "",
    color: data.color ?? "",
    height: data.height ?? "",
    notes: docToText(data.description),
  });
}

/** Saves changes to an outside ancestor. It only ever touches pedigree-only records. */
export async function updateAncestor(
  db: Db,
  ranchId: string,
  id: string,
  input: AncestorInput,
): Promise<Result<{ name: string }>> {
  const fields = ancestorColumns(input);
  if (!fields.ok) return fail(fields.message);
  const { data, error } = await db
    .from("animals")
    .update({ ...fields.columns, description: fields.columns.description as Json | null })
    .eq("id", id)
    .eq("ranch_id", ranchId)
    .eq("record_scope", "pedigree_only")
    .select("id, name");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length)
    return fail("That animal could not be found, or it's one of yours. Edit your own animals on their pages.");
  return ok({ name: data[0].name });
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
