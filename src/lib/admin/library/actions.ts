"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import type { Species } from "@/lib/domain/species";
import * as library from "./service";

const uuid = z.uuid();
const ids = z.array(uuid).min(1).max(200);
const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

async function context() {
  const slug = await currentRanchSlug();
  if (!slug) return null;
  const ctx = await requireAdmin(slug);
  if (!ctx) return null;
  return { slug, ranchId: ctx.ranch.id, enabledSpecies: ctx.ranch.enabledSpecies, db: await createServerSupabase() };
}

function refreshSite(slug: string) {
  updateTag(cacheTags.animals(slug));
  updateTag(cacheTags.site(slug));
}

export async function listLibraryAction() {
  const c = await context();
  if (!c) return noAccess;
  return library.listLibrary(c.db, c.ranchId);
}

export async function renameLibraryPhotoAction(mediaId: string, name: string) {
  const c = await context();
  if (!c || !uuid.safeParse(mediaId).success) return noAccess;
  return library.renamePhoto(c.db, mediaId, name);
}

export async function deleteLibraryPhotoAction(mediaId: string) {
  const c = await context();
  if (!c || !uuid.safeParse(mediaId).success) return noAccess;
  const result = await library.deleteLibraryPhoto(c.db, c.ranchId, mediaId);
  if (result.ok) refreshSite(c.slug);
  return result;
}

export async function attachLibraryPhotosAction(animalId: string, mediaIds: string[]) {
  const c = await context();
  if (!c || !uuid.safeParse(animalId).success || !z.array(uuid).max(100).safeParse(mediaIds).success) return noAccess;
  const result = await library.attachExistingPhotos(c.db, c.ranchId, animalId, mediaIds);
  if (result.ok) refreshSite(c.slug);
  return result;
}

/** Files photos under a species the ranch has enabled, or clears the category when species is null. */
export async function setLibraryCategoryAction(mediaIds: string[], species: string | null) {
  const c = await context();
  if (!c || !ids.safeParse(mediaIds).success) return noAccess;
  if (species !== null && !c.enabledSpecies.includes(species as Species)) {
    return { ok: false as const, message: "That category isn't turned on for this ranch." };
  }
  return library.setPhotoCategory(c.db, c.ranchId, mediaIds, species as Species | null);
}

export async function deleteLibraryPhotosAction(mediaIds: string[]) {
  const c = await context();
  if (!c || !ids.safeParse(mediaIds).success) return noAccess;
  const result = await library.deleteLibraryPhotos(c.db, c.ranchId, mediaIds);
  if (result.ok && result.data.deleted) refreshSite(c.slug);
  return result;
}

export async function searchAnimalsAction(query: string) {
  const c = await context();
  if (!c) return noAccess;
  return library.searchAnimals(c.db, c.ranchId, query.slice(0, 80));
}
