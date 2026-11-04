/** Choosing and ordering the photos in the gallery. Plain functions over the owner's Supabase client, so RLS applies. */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";
import { mediaUrl, pickVariant } from "@/lib/media/variants";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type GalleryPhoto = { id: string; thumb: string | null; name: string };
export type GalleryData = { inGallery: GalleryPhoto[]; others: GalleryPhoto[] };

export const MAX_GALLERY = 200;

export async function loadGallery(db: Db, ranchId: string): Promise<Result<GalleryData>> {
  const { data, error } = await db
    .from("media")
    .select("id, file_name, variants, in_gallery, gallery_sort, created_at")
    .eq("ranch_id", ranchId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return fail(dbErrorMessage(error));
  const toPhoto = (m: (typeof data)[number]): GalleryPhoto => {
    const v = pickVariant(m.variants as Json, 480);
    return { id: m.id, thumb: v ? mediaUrl(v.path) : null, name: m.file_name ?? "Photo" };
  };
  return ok({
    inGallery: data
      .filter((m) => m.in_gallery)
      .sort((a, b) => a.gallery_sort - b.gallery_sort)
      .map(toPhoto),
    others: data.filter((m) => !m.in_gallery).map(toPhoto),
  });
}

/** Saves the gallery as the owner left it: these photos, in this order. */
export async function saveGallery(db: Db, ranchId: string, orderedIds: string[]): Promise<Result> {
  if (orderedIds.length > MAX_GALLERY) return fail(`A gallery can hold up to ${MAX_GALLERY} photos.`);
  const { data: current, error } = await db.from("media").select("id").eq("ranch_id", ranchId).eq("in_gallery", true);
  if (error) return fail(dbErrorMessage(error));
  const keep = new Set(orderedIds);
  const removed = (current ?? []).map((m) => m.id).filter((id) => !keep.has(id));
  if (removed.length) {
    const r = await db.from("media").update({ in_gallery: false }).eq("ranch_id", ranchId).in("id", removed);
    if (r.error) return fail(dbErrorMessage(r.error));
  }
  for (let i = 0; i < orderedIds.length; i += 10) {
    const results = await Promise.all(
      orderedIds.slice(i, i + 10).map((id, j) =>
        db
          .from("media")
          .update({ in_gallery: true, gallery_sort: i + j })
          .eq("ranch_id", ranchId)
          .eq("id", id),
      ),
    );
    const bad = results.find((r) => r.error);
    if (bad?.error) return fail(dbErrorMessage(bad.error));
  }
  return ok(null);
}
