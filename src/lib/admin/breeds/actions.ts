"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import type { Species } from "@/lib/domain/species";
import * as breeds from "./service";

const uuid = z.uuid();
const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

async function context() {
  const slug = await currentRanchSlug();
  if (!slug) return null;
  const ctx = await requireAdmin(slug);
  if (!ctx) return null;
  return { slug, ranchId: ctx.ranch.id, enabledSpecies: ctx.ranch.enabledSpecies, db: await createServerSupabase() };
}

/** Renames change what visitors see on animal pages, so the public site is refreshed. */
function refreshSite(slug: string) {
  updateTag(cacheTags.animals(slug));
  updateTag(cacheTags.site(slug));
}

export async function addBreedAction(species: string, name: string) {
  const c = await context();
  if (!c) return noAccess;
  if (!c.enabledSpecies.includes(species as Species)) {
    return { ok: false as const, message: "That type of animal isn't turned on for this ranch." };
  }
  return breeds.addBreed(c.db, c.ranchId, species as Species, name);
}

export async function renameBreedAction(id: string, name: string) {
  const c = await context();
  if (!c || !uuid.safeParse(id).success) return noAccess;
  const result = await breeds.renameBreed(c.db, id, name);
  if (result.ok) refreshSite(c.slug);
  return result;
}

export async function removeBreedAction(id: string) {
  const c = await context();
  if (!c || !uuid.safeParse(id).success) return noAccess;
  return breeds.removeBreed(c.db, c.ranchId, id);
}

export async function restoreBreedAction(id: string) {
  const c = await context();
  if (!c || !uuid.safeParse(id).success) return noAccess;
  return breeds.restoreBreed(c.db, id);
}
