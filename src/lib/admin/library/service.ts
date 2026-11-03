/**
 * Photo Library: every photo the ranch has uploaded, whether or not an animal
 * uses it. Plain functions over the owner's Supabase client, so RLS applies.
 */
import type { Json } from "@/lib/database.types";
import type { Species } from "@/lib/domain/species";
import { dbErrorMessage } from "@/lib/auth/messages";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import type { Db, Result } from "@/lib/admin/animals/service";
import { checkFileName, extensionFor } from "./file-names";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type LibraryPhoto = {
  id: string;
  fileName: string | null;
  thumb: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  /** Animals using this photo, by name. */
  usedBy: string[];
  /** Species of those animals, once each, for sorting the library. */
  species: Species[];
  /** Category the owner filed the photo under, if any. */
  category: Species | null;
  /** True when something other than an animal uses it (homepage slide, update post, gallery). */
  usedElsewhere: boolean;
};

const LIMIT = 1000;

export async function listLibrary(db: Db, ranchId: string): Promise<Result<LibraryPhoto[]>> {
  const { data: media, error } = await db
    .from("media")
    .select("id, file_name, variants, width, height, created_at, in_gallery, species")
    .eq("ranch_id", ranchId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) return fail(dbErrorMessage(error));
  if (!media.length) return ok([]);

  const ids = media.map((m) => m.id);
  const [animalLinks, postLinks, featured, slides] = await Promise.all([
    db.from("animal_media").select("media_id, animals ( name, species )").eq("ranch_id", ranchId).in("media_id", ids),
    db.from("post_media").select("media_id").in("media_id", ids),
    db.from("posts").select("featured_media_id").eq("ranch_id", ranchId).in("featured_media_id", ids),
    db.from("hero_slides").select("media_id").eq("ranch_id", ranchId).in("media_id", ids),
  ]);
  for (const r of [animalLinks, postLinks, featured, slides]) if (r.error) return fail(dbErrorMessage(r.error));

  const usedBy = new Map<string, string[]>();
  const speciesOf = new Map<string, Set<Species>>();
  for (const link of animalLinks.data ?? []) {
    const animal = Array.isArray(link.animals) ? link.animals[0] : link.animals;
    if (animal?.name) usedBy.set(link.media_id, [...(usedBy.get(link.media_id) ?? []), animal.name]);
    if (animal?.species) speciesOf.set(link.media_id, (speciesOf.get(link.media_id) ?? new Set()).add(animal.species));
  }
  const elsewhere = new Set<string>([
    ...(postLinks.data ?? []).map((r) => r.media_id),
    ...(featured.data ?? []).map((r) => r.featured_media_id).filter((id): id is string => Boolean(id)),
    ...(slides.data ?? []).map((r) => r.media_id).filter((id): id is string => Boolean(id)),
    ...media.filter((m) => m.in_gallery).map((m) => m.id),
  ]);

  return ok(
    media.map((m) => {
      const thumb = pickVariant(m.variants as Json, 480);
      return {
        id: m.id,
        fileName: m.file_name,
        thumb: thumb ? mediaUrl(thumb.path) : null,
        width: m.width,
        height: m.height,
        createdAt: m.created_at,
        usedBy: usedBy.get(m.id) ?? [],
        species: [...(speciesOf.get(m.id) ?? [])],
        category: m.species,
        usedElsewhere: elsewhere.has(m.id),
      };
    }),
  );
}

/** Names already taken in this ranch, for numbering a new upload. */
export async function takenFileNames(db: Db, ranchId: string): Promise<string[]> {
  const { data } = await db
    .from("media")
    .select("file_name")
    .eq("ranch_id", ranchId)
    .not("file_name", "is", null)
    .limit(5000);
  return (data ?? []).map((r) => r.file_name!).filter(Boolean);
}

export async function renamePhoto(db: Db, mediaId: string, rawName: string): Promise<Result<{ name: string }>> {
  const { data: current, error: readError } = await db
    .from("media")
    .select("file_name, mime_type")
    .eq("id", mediaId)
    .maybeSingle();
  if (readError) return fail(dbErrorMessage(readError));
  if (!current) return fail("That photo could not be found. Refresh the page and try again.");

  const checked = checkFileName(rawName, extensionFor(current.file_name, current.mime_type));
  if (!checked.ok) return fail(checked.message);
  const { data, error } = await db.from("media").update({ file_name: checked.name }).eq("id", mediaId).select("id");
  if (error) {
    return error.code === "23505" ? fail("Another photo already has that name.") : fail(dbErrorMessage(error));
  }
  if (!data?.length) return fail("That photo could not be found. Refresh the page and try again.");
  return ok({ name: checked.name });
}

/** What is using a photo, in words the owner can act on. Empty when nothing does. */
async function usage(db: Db, ranchId: string, mediaId: string): Promise<string[] | null> {
  const [animals, posts, featured, slides, gallery] = await Promise.all([
    db.from("animal_media").select("animals ( name )").eq("ranch_id", ranchId).eq("media_id", mediaId),
    db.from("post_media").select("media_id", { count: "exact", head: true }).eq("media_id", mediaId),
    db
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("ranch_id", ranchId)
      .eq("featured_media_id", mediaId),
    db.from("hero_slides").select("id", { count: "exact", head: true }).eq("ranch_id", ranchId).eq("media_id", mediaId),
    db.from("media").select("in_gallery").eq("id", mediaId).maybeSingle(),
  ]);
  if ([animals, posts, featured, slides, gallery].some((r) => r.error)) return null;
  const out: string[] = [];
  const names = (animals.data ?? [])
    .map((r) => (Array.isArray(r.animals) ? r.animals[0]?.name : r.animals?.name))
    .filter((n): n is string => Boolean(n));
  if (names.length)
    out.push(names.length > 2 ? `${names.slice(0, 2).join(", ")} and ${names.length - 2} more` : names.join(" and "));
  if ((posts.count ?? 0) + (featured.count ?? 0) > 0) out.push("an update post");
  if ((slides.count ?? 0) > 0) out.push("a homepage slide");
  if (gallery.data?.in_gallery) out.push("the Gallery");
  return out;
}

/** Deletes a photo and its files, but only when nothing uses it. */
export async function deleteLibraryPhoto(db: Db, ranchId: string, mediaId: string): Promise<Result> {
  const used = await usage(db, ranchId, mediaId);
  if (used === null) return fail("Couldn't check where this photo is used. Please try again.");
  if (used.length) return fail(`This photo is used by ${used.join(", ")}. Remove it there first.`);

  const { data: media } = await db
    .from("media")
    .select("original_path, variants")
    .eq("id", mediaId)
    .eq("ranch_id", ranchId)
    .maybeSingle();
  if (!media) return fail("That photo could not be found. Refresh the page and try again.");
  const variantPaths = Object.values((media.variants ?? {}) as Record<string, { path: string }>).map((v) => v.path);
  if (variantPaths.length) await db.storage.from("ranch-media").remove(variantPaths);
  if (media.original_path) await db.storage.from("ranch-originals").remove([media.original_path]);
  const { data: deleted, error } = await db
    .from("media")
    .delete()
    .eq("id", mediaId)
    .eq("ranch_id", ranchId)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  if (!deleted?.length) return fail("That photo couldn't be deleted. Please try again.");
  return ok(null);
}

/** Puts photos from the library onto an animal, after its existing ones. */
export async function attachExistingPhotos(
  db: Db,
  ranchId: string,
  animalId: string,
  mediaIds: string[],
): Promise<Result<{ added: number }>> {
  const unique = [...new Set(mediaIds)];
  if (!unique.length) return ok({ added: 0 });
  const { data: valid, error } = await db
    .from("media")
    .select("id")
    .eq("ranch_id", ranchId)
    .eq("status", "ready")
    .in("id", unique);
  if (error) return fail(dbErrorMessage(error));
  const okIds = new Set((valid ?? []).map((m) => m.id));
  const { data: existing } = await db.from("animal_media").select("media_id, sort_order").eq("animal_id", animalId);
  const already = new Set((existing ?? []).map((r) => r.media_id));
  let next = Math.max(0, ...(existing ?? []).map((r) => r.sort_order)) + 1;
  const rows = unique
    .filter((id) => okIds.has(id) && !already.has(id))
    .map((id) => ({ ranch_id: ranchId, animal_id: animalId, media_id: id, sort_order: next++ }));
  if (!rows.length) return ok({ added: 0 });
  const { error: insertError } = await db.from("animal_media").insert(rows);
  if (insertError) return fail(dbErrorMessage(insertError));
  return ok({ added: rows.length });
}

/** Files photos under a species, or clears it (null). Only photos of this ranch are touched. */
export async function setPhotoCategory(
  db: Db,
  ranchId: string,
  mediaIds: string[],
  species: Species | null,
): Promise<Result<{ changed: number }>> {
  if (!mediaIds.length) return ok({ changed: 0 });
  const { data, error } = await db
    .from("media")
    .update({ species })
    .eq("ranch_id", ranchId)
    .in("id", mediaIds)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  return ok({ changed: data?.length ?? 0 });
}

/** Deletes each photo nothing uses; reports the ones it had to keep. */
export async function deleteLibraryPhotos(
  db: Db,
  ranchId: string,
  mediaIds: string[],
): Promise<Result<{ deleted: number; kept: number }>> {
  let deleted = 0;
  let kept = 0;
  for (const id of mediaIds) {
    const result = await deleteLibraryPhoto(db, ranchId, id);
    if (result.ok) deleted++;
    else kept++;
  }
  return ok({ deleted, kept });
}

export type AnimalChoice = { id: string; name: string; detail: string };

/** Animals matching what the owner typed, for "Add to an animal". */
export async function searchAnimals(db: Db, ranchId: string, query: string): Promise<Result<AnimalChoice[]>> {
  const q = query.trim().replace(/[%_,()]/g, "");
  let request = db
    .from("animals")
    .select("id, name, species, animal_categories ( label_singular )")
    .eq("ranch_id", ranchId)
    .eq("record_scope", "inventory")
    .is("archived_at", null)
    .order("name")
    .limit(20);
  if (q) request = request.ilike("name", `%${q}%`);
  const { data, error } = await request;
  if (error) return fail(dbErrorMessage(error));
  return ok(
    data.map((a) => {
      const cat = Array.isArray(a.animal_categories) ? a.animal_categories[0] : a.animal_categories;
      return { id: a.id, name: a.name, detail: cat?.label_singular ?? a.species };
    }),
  );
}
