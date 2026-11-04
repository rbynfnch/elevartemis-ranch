"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import type { Species } from "@/lib/domain/species";
import * as pedigree from "./service";

const uuid = z.uuid();
const role = z.enum(["sire", "dam"]);
const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

async function context() {
  const slug = await currentRanchSlug();
  if (!slug) return null;
  const ctx = await requireAdmin(slug);
  if (!ctx) return null;
  return { slug, ranchId: ctx.ranch.id, db: await createServerSupabase() };
}

/** Pedigrees appear on animal pages and offspring lists, so the public site refreshes after a change. */
function refreshSite(slug: string) {
  updateTag(cacheTags.animals(slug));
  updateTag(cacheTags.site(slug));
}

/** The species comes from the animal itself, never from the browser. */
async function speciesOf(
  c: NonNullable<Awaited<ReturnType<typeof context>>>,
  animalId: string,
): Promise<Species | null> {
  const { data } = await c.db
    .from("animals")
    .select("species")
    .eq("id", animalId)
    .eq("ranch_id", c.ranchId)
    .maybeSingle();
  return data?.species ?? null;
}

export async function searchParentsAction(childId: string, roleName: string, q: string) {
  const c = await context();
  const r = role.safeParse(roleName);
  if (!c || !uuid.safeParse(childId).success || !r.success) return noAccess;
  const species = await speciesOf(c, childId);
  if (!species) return { ok: false as const, message: "That animal could not be found." };
  return pedigree.searchParents(c.db, c.ranchId, { species, role: r.data, q: q.slice(0, 80), excludeId: childId });
}

export async function setParentAction(childId: string, roleName: string, parentId: string | null) {
  const c = await context();
  const r = role.safeParse(roleName);
  if (
    !c ||
    !uuid.safeParse(childId).success ||
    !r.success ||
    (parentId !== null && !uuid.safeParse(parentId).success)
  ) {
    return noAccess;
  }
  const result = await pedigree.setParent(c.db, childId, r.data, parentId);
  if (result.ok) refreshSite(c.slug);
  return result;
}

const outside = z.object({
  name: z.string().max(200),
  registry: z.string().max(200).nullish(),
  registrationNumber: z.string().max(200).nullish(),
  birthYear: z.number().int().nullish(),
  color: z.string().max(200).nullish(),
  breed: z.string().max(200).nullish(),
  notes: z.string().max(5000).nullish(),
});

/** Records an ancestor the ranch doesn't own and makes them this animal's sire or dam, in one step. */
export async function addAncestorAction(childId: string, roleName: string, input: unknown) {
  const c = await context();
  const r = role.safeParse(roleName);
  const parsed = outside.safeParse(input);
  if (!c || !uuid.safeParse(childId).success || !r.success) return noAccess;
  if (!parsed.success) return { ok: false as const, message: "Check the details and try again." };
  const species = await speciesOf(c, childId);
  if (!species) return { ok: false as const, message: "That animal could not be found." };

  const added = await pedigree.addOutsideAncestor(c.db, c.ranchId, species, r.data, parsed.data);
  if (!added.ok) return added;
  const linked = await pedigree.setParent(c.db, childId, r.data, added.data.id);
  if (!linked.ok) return linked;
  refreshSite(c.slug);
  return added;
}
