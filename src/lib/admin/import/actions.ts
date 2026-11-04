"use server";

import { updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as importer from "./service";
import * as pedigreeImporter from "./pedigree-service";

const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };
const MAX_CHARS = 900_000;

async function context() {
  const slug = await currentRanchSlug();
  if (!slug) return null;
  const ctx = await requireAdmin(slug);
  if (!ctx) return null;
  return { slug, ranchId: ctx.ranch.id, enabledSpecies: ctx.ranch.enabledSpecies, db: await createServerSupabase() };
}

const tooBig = {
  ok: false as const,
  message: "That file is too large. Split it into smaller files of up to 500 rows.",
};

export async function previewImportAction(csv: string) {
  const c = await context();
  if (!c) return noAccess;
  if (csv.length > MAX_CHARS) return tooBig;
  return importer.previewImport(c.db, c.ranchId, c.enabledSpecies, csv);
}

export async function commitImportAction(csv: string) {
  const c = await context();
  if (!c) return noAccess;
  if (csv.length > MAX_CHARS) return tooBig;
  const result = await importer.commitImport(c.db, c.ranchId, c.enabledSpecies, csv);
  if (result.ok) {
    updateTag(cacheTags.animals(c.slug));
    updateTag(cacheTags.site(c.slug));
  }
  return result;
}

export async function exportAnimalsAction() {
  const c = await context();
  if (!c) return noAccess;
  return importer.exportAnimalsCsv(c.db, c.ranchId);
}

export async function previewPedigreeImportAction(csv: string) {
  const c = await context();
  if (!c) return noAccess;
  if (csv.length > MAX_CHARS) return tooBig;
  return pedigreeImporter.previewPedigreeImport(c.db, c.ranchId, csv);
}

export async function commitPedigreeImportAction(csv: string) {
  const c = await context();
  if (!c) return noAccess;
  if (csv.length > MAX_CHARS) return tooBig;
  const result = await pedigreeImporter.commitPedigreeImport(c.db, c.ranchId, csv);
  if (result.ok) {
    updateTag(cacheTags.animals(c.slug));
    updateTag(cacheTags.site(c.slug));
  }
  return result;
}
