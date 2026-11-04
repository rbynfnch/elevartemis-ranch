"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { speciesTerms } from "@/lib/domain/species";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as service from "./service";
import { parseAnimalEdit, parseBasics } from "./schemas";

export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Shown beside the message after a save, e.g. "View Midnight Sonata on the website". */
  link?: { href: string; label: string };
};

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

/**
 * The Save button at the end of the animal page. Every section is checked
 * first; only then are they written, in order. If a database rule rejects one
 * section the message says which ones were saved and which was not.
 */
export async function saveAnimalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const c = await context();
  const id = idFrom(fd);
  if (!c || !id) return noAccess;
  const parsed = parseAnimalEdit(fd);
  if (!parsed.ok)
    return { message: "Check the highlighted fields. Nothing was saved yet.", fieldErrors: parsed.fieldErrors };
  const d = parsed.data;

  type Step = [label: string, run: () => Promise<service.Result<unknown>>];
  const steps: Step[] = [
    ["Basics", () => service.updateBasics(c.db, id, d.basics)],
    ["Headline and highlights", () => service.saveProfile(c.db, c.ranchId, id, d.profile)],
    ["On the website", () => service.saveStatus(c.db, id, d.status)],
    ["For Sale", () => service.saveSale(c.db, c.ranchId, id, d.sale)],
  ];
  if (d.breeding) {
    const breeding = d.breeding;
    steps.push(["Breeding", () => service.saveBreeding(c.db, c.ranchId, id, breeding)]);
  }
  if (d.performance !== undefined) {
    const performance = d.performance;
    steps.push(["Performance", () => service.savePerformance(c.db, c.ranchId, id, performance)]);
  }
  steps.push(["Facts and stories", () => service.saveDetails(c.db, id, d.details)]);

  const done: string[] = [];
  for (const [label, run] of steps) {
    const result = await run();
    if (!result.ok) {
      if (done.length) refreshSite(c.slug);
      const earlier = done.length ? `${done.join(", ")} saved, but ` : "";
      return { message: `${earlier}${label} could not be saved: ${result.message}`, fieldErrors: result.fieldErrors };
    }
    done.push(label);
  }
  refreshSite(c.slug);

  // The page's web address comes from its name, so read it back after the save.
  let link: ActionState["link"];
  if (d.status.is_published) {
    const { data } = await c.db.from("animals").select("slug, species, name").eq("id", id).maybeSingle();
    if (data?.slug) {
      link = { href: `/${speciesTerms[data.species].path}/${data.slug}`, label: `View ${data.name} on the website` };
    }
  }
  return {
    ...saved(
      d.status.is_published
        ? "Saved. This animal is on your website."
        : "Saved. This animal is hidden from your website.",
    ),
    link,
  };
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
  /** Omit when uploading to the Photo Library (no animal yet). */
  animalId?: string | null;
  fileName?: string | null;
  takenAt: string | null;
  altText: string | null;
}) {
  const c = await context();
  if (!c) return { ok: false as const, message: noAccess.message! };
  const parsed = z
    .object({
      mediaId: uuid,
      animalId: uuid.nullish(),
      fileName: z.string().max(500).nullish(),
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
