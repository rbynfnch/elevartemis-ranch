"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as service from "./service";
import { parseBasics, parseBreeding, parseDetails, parsePerformance, parseSale, parseStatus } from "./schemas";

export type ActionState = { ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

const uuid = z.uuid();

/** Signed-in owner of the ranch on this domain, or an error. */
async function context() {
  const slug = await currentRanchSlug();
  if (!slug) throw new Error("Unknown site");
  const ctx = await requireAdmin(slug);
  if (!ctx) return null;
  return { slug, ranchId: ctx.ranch.id, db: await createServerSupabase() };
}

const noAccess: ActionState = { message: "You don't have access to make changes here. Try signing in again." };
const saved = (message = "Saved."): ActionState => ({ ok: true, message });

/** The public site updates as soon as the save lands. */
function refreshSite(slug: string) {
  updateTag(cacheTags.animals(slug));
  updateTag(cacheTags.site(slug));
}

function idFrom(fd: FormData): string | null {
  const parsed = uuid.safeParse(fd.get("id"));
  return parsed.success ? parsed.data : null;
}

// ─── Create / edit ───────────────────────────────────────────────────────────
export async function createAnimalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await context();
  if (!c) return noAccess;
  const parsed = parseBasics(fd);
  if (!parsed.ok) return { message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const result = await service.createAnimal(c.db, c.ranchId, parsed.data);
  if (!result.ok) return { message: result.message };
  redirect(`/admin/animals/${result.data.id}?added=1`);
}

export async function updateBasicsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) return noAccess;
  const parsed = parseBasics(fd);
  if (!parsed.ok) return { message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const result = await service.updateBasics(c.db, id, parsed.data);
  if (!result.ok) return { message: result.message };
  refreshSite(c.slug);
  return saved();
}

export async function saveStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) return noAccess;
  const parsed = parseStatus(fd);
  if (!parsed.ok) return { message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const result = await service.saveStatus(c.db, id, parsed.data);
  if (!result.ok) return { message: result.message };
  refreshSite(c.slug);
  return saved(
    parsed.data.is_published
      ? "Saved. This animal is on your website."
      : "Saved. This animal is hidden from your website.",
  );
}

export async function saveSaleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) return noAccess;
  const parsed = parseSale(fd);
  if (!parsed.ok) return { message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const result = await service.saveSale(c.db, c.ranchId, id, parsed.data);
  if (!result.ok) return { message: result.message };
  refreshSite(c.slug);
  const status = parsed.data?.status;
  return saved(
    status === "sold"
      ? "Saved. Marked as sold — it's off the For Sale page and keeps its portfolio."
      : status
        ? "Saved. It's on the For Sale page."
        : "Saved. Not for sale.",
  );
}

export async function saveBreedingAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) return noAccess;
  const parsed = parseBreeding(fd);
  if (!parsed.ok) return { message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const result = await service.saveBreeding(c.db, c.ranchId, id, parsed.data);
  if (!result.ok) return { message: result.message };
  refreshSite(c.slug);
  return saved();
}

export async function savePerformanceAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) return noAccess;
  const parsed = parsePerformance(fd);
  if (!parsed.ok) return { message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const result = await service.savePerformance(c.db, c.ranchId, id, parsed.data);
  if (!result.ok) return { message: result.message };
  refreshSite(c.slug);
  return saved();
}

export async function saveDetailsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) return noAccess;
  const parsed = parseDetails(fd);
  if (!parsed.ok) return { message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const result = await service.saveDetails(c.db, id, parsed.data);
  if (!result.ok) return { message: result.message };
  refreshSite(c.slug);
  return saved();
}

export async function keepCategoryAction(fd: FormData): Promise<void> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) redirect("/admin");
  await service.keepCategory(c.db, id);
  redirect(`/admin/animals/${id}?kept=1`);
}

// ─── Recently Deleted ────────────────────────────────────────────────────────
export async function archiveAnimalAction(fd: FormData): Promise<void> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) redirect("/admin/animals");
  const result = await service.archiveAnimal(c.db, id);
  if (result.ok) refreshSite(c.slug);
  redirect(result.ok ? `/admin/animals?moved=${encodeURIComponent(result.data.name)}` : "/admin/animals");
}

export async function restoreAnimalAction(fd: FormData): Promise<void> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) redirect("/admin/recently-deleted");
  const result = await service.restoreAnimal(c.db, id);
  if (result.ok) refreshSite(c.slug);
  redirect(
    result.ok ? `/admin/recently-deleted?restored=${encodeURIComponent(result.data.name)}` : "/admin/recently-deleted",
  );
}

export async function deleteForeverAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) return noAccess;
  const result = await service.deleteForever(c.db, c.ranchId, id, String(fd.get("confirm_name") ?? ""));
  if (!result.ok) return { message: result.message, fieldErrors: result.fieldErrors };
  refreshSite(c.slug);
  redirect(`/admin/recently-deleted?deleted=${encodeURIComponent(result.data.name)}`);
}

// ─── Photos (called directly from the photo manager) ─────────────────────────
export async function startPhotoUploadAction() {
  const c = await context();
  if (!c) return { ok: false as const, message: noAccess.message! };
  return service.startPhotoUpload(c.db, c.ranchId);
}

export async function finishPhotoUploadAction(input: {
  mediaId: string;
  animalId: string;
  takenAt: string | null;
  altText: string | null;
}) {
  const c = await context();
  if (!c) return { ok: false as const, message: noAccess.message! };
  const parsed = z
    .object({
      mediaId: uuid,
      animalId: uuid,
      takenAt: z.iso.datetime().nullable(),
      altText: z.string().max(300).nullable(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Something went wrong with that upload." };
  const result = await service.finishPhotoUpload(c.db, c.ranchId, parsed.data.mediaId, parsed.data);
  if (result.ok) refreshSite(c.slug);
  return result;
}

export async function setMainPhotoAction(animalId: string, mediaId: string) {
  const c = await context();
  if (!c || !uuid.safeParse(animalId).success || !uuid.safeParse(mediaId).success)
    return { ok: false as const, message: noAccess.message! };
  const result = await service.setMainPhoto(c.db, animalId, mediaId);
  if (result.ok) refreshSite(c.slug);
  return result;
}

export async function reorderPhotosAction(animalId: string, mediaIds: string[]) {
  const c = await context();
  if (!c || !z.array(uuid).max(500).safeParse(mediaIds).success)
    return { ok: false as const, message: noAccess.message! };
  const result = await service.reorderPhotos(c.db, animalId, mediaIds);
  if (result.ok) refreshSite(c.slug);
  return result;
}

export async function updatePhotoAction(
  mediaId: string,
  input: { altText?: string | null; focalX?: number; focalY?: number },
) {
  const c = await context();
  const parsed = z
    .object({
      altText: z.string().max(300).nullable().optional(),
      focalX: z.number().min(0).max(1).optional(),
      focalY: z.number().min(0).max(1).optional(),
    })
    .safeParse(input);
  if (!c || !uuid.safeParse(mediaId).success || !parsed.success)
    return { ok: false as const, message: noAccess.message! };
  const alt = parsed.data.altText === undefined ? undefined : parsed.data.altText?.trim() || null;
  const result = await service.updatePhoto(c.db, mediaId, {
    alt_text: alt,
    focal_x: parsed.data.focalX,
    focal_y: parsed.data.focalY,
  });
  if (result.ok) refreshSite(c.slug);
  return result;
}

export async function removePhotoAction(animalId: string, mediaId: string) {
  const c = await context();
  if (!c || !uuid.safeParse(animalId).success || !uuid.safeParse(mediaId).success)
    return { ok: false as const, message: noAccess.message! };
  const result = await service.removePhoto(c.db, c.ranchId, animalId, mediaId);
  if (result.ok) refreshSite(c.slug);
  return result;
}
