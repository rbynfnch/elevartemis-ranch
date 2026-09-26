/**
 * Animal management: every read and write the admin performs, as plain
 * functions over a Supabase client. They run as the signed-in owner, so RLS
 * (ranch isolation, two-step verification) applies to all of them. No
 * server-only imports, so the end-to-end tests can call the same code.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import { processImage } from "@/lib/media/process";
import type { BasicsInput, BreedingInput, DetailsInput, PerformanceInput, SaleInput, StatusInput } from "./schemas";

export type Db = SupabaseClient<Database>;
export type Result<T = null> =
  { ok: true; data: T } | { ok: false; message: string; fieldErrors?: Record<string, string> };

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string, fieldErrors?: Record<string, string>): Result<never> => ({
  ok: false,
  message,
  fieldErrors,
});
const dbFail = (error: { code?: string; message?: string }) => fail(dbErrorMessage(error));
const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/**
 * An UPDATE that matches no rows isn't an error in Supabase, so a missing or
 * someone-else's id would otherwise report "Saved". Require that a row changed.
 */
function changed(result: { data: unknown[] | null; error: { code?: string; message?: string } | null }): Result {
  if (result.error) return dbFail(result.error);
  if (!result.data?.length) return fail("That animal could not be found. Refresh the page and try again.");
  return ok(null);
}

// ─── Lists ───────────────────────────────────────────────────────────────────
export type AnimalListItem = {
  id: string;
  name: string;
  slug: string;
  species: "horse" | "cattle";
  categoryId: string | null;
  categoryLabel: string;
  birthYear: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  programStatus: Database["public"]["Enums"]["program_status"];
  saleStatus: Database["public"]["Enums"]["sale_status"] | null;
  isDemo: boolean;
  primaryMediaId: string | null;
  thumb: { variants: Json; focalX: number; focalY: number } | null;
  archivedAt: string | null;
};

export type ListFilter = { species?: "horse" | "cattle"; show?: string; q?: string; archived?: boolean };

export async function listAnimals(db: Db, ranchId: string, filter: ListFilter = {}): Promise<Result<AnimalListItem[]>> {
  let query = db
    .from("animals")
    .select(
      "id, name, slug, species, category_id, birth_year, is_published, is_featured, program_status, is_demo, primary_media_id, archived_at, animal_categories ( label_singular ), sale_listings ( status )",
    )
    .eq("ranch_id", ranchId)
    .eq("record_scope", "inventory");
  query = filter.archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (filter.species) query = query.eq("species", filter.species);
  if (filter.q?.trim()) query = query.ilike("name", `%${filter.q.trim().replace(/[%_]/g, "")}%`);
  if (filter.show === "hidden") query = query.eq("is_published", false);
  if (filter.show === "no-photo") query = query.is("primary_media_id", null);
  if (filter.show === "sample") query = query.eq("is_demo", true);
  if (filter.show?.includes(".")) query = query.eq("category_id", filter.show);
  const { data, error } = await query
    .order(filter.archived ? "archived_at" : "species", { ascending: !filter.archived })
    .order("display_order")
    .order("name");
  if (error) return dbFail(error);

  const mediaIds = data.map((a) => a.primary_media_id).filter((id): id is string => Boolean(id));
  const media = new Map<string, { variants: Json; focal_x: number; focal_y: number }>();
  if (mediaIds.length) {
    const { data: rows, error: mediaError } = await db
      .from("media")
      .select("id, variants, focal_x, focal_y")
      .in("id", mediaIds);
    if (mediaError) return dbFail(mediaError);
    for (const m of rows) media.set(m.id, m);
  }

  let items: AnimalListItem[] = data.map((a) => {
    const m = a.primary_media_id ? media.get(a.primary_media_id) : undefined;
    return {
      id: a.id,
      name: a.name,
      slug: a.slug,
      species: a.species,
      categoryId: a.category_id,
      categoryLabel: one(a.animal_categories)?.label_singular ?? "",
      birthYear: a.birth_year,
      isPublished: a.is_published,
      isFeatured: a.is_featured,
      programStatus: a.program_status,
      saleStatus: one(a.sale_listings)?.status ?? null,
      isDemo: a.is_demo,
      primaryMediaId: a.primary_media_id,
      thumb: m ? { variants: m.variants, focalX: Number(m.focal_x), focalY: Number(m.focal_y) } : null,
      archivedAt: a.archived_at,
    };
  });
  if (filter.show === "for-sale")
    items = items.filter((a) => a.saleStatus === "available" || a.saleStatus === "pending");
  return ok(items);
}

// ─── One animal, everything the editor needs ─────────────────────────────────
export async function getAnimal(db: Db, ranchId: string, id: string) {
  const [animal, sale, breeding, performance, facts, sections, photos] = await Promise.all([
    db.from("animals").select("*").eq("ranch_id", ranchId).eq("id", id).maybeSingle(),
    db.from("sale_listings").select("*").eq("animal_id", id).maybeSingle(),
    db.from("breeding_services").select("*").eq("animal_id", id).maybeSingle(),
    db.from("cattle_performance").select("*").eq("animal_id", id).maybeSingle(),
    db.from("animal_facts").select("label, value").eq("animal_id", id).order("sort_order"),
    db.from("animal_sections").select("heading, body").eq("animal_id", id).order("sort_order"),
    db
      .from("animal_media")
      .select(
        "media_id, sort_order, media ( id, variants, width, height, focal_x, focal_y, alt_text, status, taken_at )",
      )
      .eq("animal_id", id)
      .order("sort_order"),
  ]);
  for (const r of [animal, sale, breeding, performance, facts, sections, photos]) if (r.error) return dbFail(r.error);
  if (!animal.data) return fail("That animal could not be found.");
  return ok({
    animal: animal.data,
    sale: sale.data,
    breeding: breeding.data,
    performance: performance.data,
    facts: facts.data ?? [],
    sections: sections.data ?? [],
    photos: (photos.data ?? [])
      .map((p) => ({
        ...one(p.media)!,
        sortOrder: p.sort_order,
        isPrimary: p.media_id === animal.data!.primary_media_id,
      }))
      .filter((p) => p.id),
  });
}
export type AnimalDetail = Extract<Awaited<ReturnType<typeof getAnimal>>, { ok: true }>["data"];

// ─── Create and edit ─────────────────────────────────────────────────────────
export async function createAnimal(db: Db, ranchId: string, input: BasicsInput): Promise<Result<{ id: string }>> {
  const { data, error } = await db
    .from("animals")
    .insert({ ...input, description: input.description as Json, ranch_id: ranchId, is_published: false, slug: "" })
    .select("id")
    .single();
  if (error) return dbFail(error);
  return ok({ id: data.id });
}

export async function updateBasics(db: Db, id: string, input: BasicsInput): Promise<Result> {
  return changed(
    await db
      .from("animals")
      .update({ ...input, description: input.description as Json })
      .eq("id", id)
      .select("id"),
  );
}

export async function saveStatus(db: Db, id: string, input: StatusInput): Promise<Result> {
  return changed(await db.from("animals").update(input).eq("id", id).select("id"));
}

/** The owner's call: keep an animal in its category (silences the dashboard suggestion). */
export async function keepCategory(db: Db, id: string): Promise<Result> {
  return changed(
    await db.from("animals").update({ category_confirmed_at: new Date().toISOString() }).eq("id", id).select("id"),
  );
}

export async function saveSale(db: Db, ranchId: string, id: string, input: SaleInput): Promise<Result> {
  if (input === null) {
    const { error } = await db.from("sale_listings").delete().eq("animal_id", id);
    return error ? dbFail(error) : ok(null);
  }
  const { error } = await db
    .from("sale_listings")
    .upsert(
      { ...input, sales_description: input.sales_description as Json, animal_id: id, ranch_id: ranchId },
      { onConflict: "animal_id" },
    );
  return error ? dbFail(error) : ok(null);
}

/** Turning breeding off keeps the details, so nothing is lost if it's turned back on. */
export async function saveBreeding(db: Db, ranchId: string, id: string, input: BreedingInput): Promise<Result> {
  const toggled = changed(
    await db.from("animals").update({ breeding_available: input.breeding_available }).eq("id", id).select("id"),
  );
  if (!toggled.ok || !input.breeding_available) return toggled;
  const r = input.row;
  const { error: upsertError } = await db.from("breeding_services").upsert(
    {
      ...r,
      shipping_info: r.shipping_info as Json,
      female_requirements: r.female_requirements as Json,
      additional_terms: r.additional_terms as Json,
      animal_id: id,
      ranch_id: ranchId,
    },
    { onConflict: "animal_id" },
  );
  return upsertError ? dbFail(upsertError) : ok(null);
}

export async function savePerformance(db: Db, ranchId: string, id: string, input: PerformanceInput): Promise<Result> {
  if (input === null) {
    const { error } = await db.from("cattle_performance").delete().eq("animal_id", id);
    return error ? dbFail(error) : ok(null);
  }
  const { error } = await db
    .from("cattle_performance")
    .upsert(
      { ...input, epds: input.epds as unknown as NonNullable<Json>, animal_id: id, ranch_id: ranchId },
      { onConflict: "animal_id" },
    );
  return error ? dbFail(error) : ok(null);
}

export async function saveDetails(db: Db, id: string, input: DetailsInput): Promise<Result> {
  const { error } = await db.rpc("replace_animal_details", {
    p_animal: id,
    p_facts: input.facts as unknown as NonNullable<Json>,
    p_sections: input.sections as unknown as NonNullable<Json>,
  });
  return error ? dbFail(error) : ok(null);
}

// ─── Recently Deleted ────────────────────────────────────────────────────────
export async function archiveAnimal(db: Db, id: string): Promise<Result<{ name: string }>> {
  const { data, error } = await db
    .from("animals")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("name")
    .single();
  return error ? dbFail(error) : ok({ name: data.name });
}

export async function restoreAnimal(db: Db, id: string): Promise<Result<{ name: string }>> {
  const { data, error } = await db.from("animals").update({ archived_at: null }).eq("id", id).select("name").single();
  return error ? dbFail(error) : ok({ name: data.name });
}

/** Permanent. Requires the owner to type the animal's name; photos only it used are removed too. */
export async function deleteForever(
  db: Db,
  ranchId: string,
  id: string,
  typedName: string,
): Promise<Result<{ name: string }>> {
  const { data: animal, error } = await db.from("animals").select("name, archived_at").eq("id", id).maybeSingle();
  if (error) return dbFail(error);
  if (!animal) return fail("That animal could not be found.");
  if (!animal.archived_at) return fail("Move the animal to Recently Deleted first.");
  if (typedName.trim().toLowerCase() !== animal.name.trim().toLowerCase()) {
    return fail(`Type “${animal.name}” exactly to confirm.`, { confirm_name: "The name doesn't match." });
  }
  const { data: photos } = await db.from("animal_media").select("media_id").eq("animal_id", id);
  const { data: deleted, error: deleteError } = await db.from("animals").delete().eq("id", id).select("id");
  if (deleteError) return dbFail(deleteError);
  if (!deleted?.length) return fail("That animal couldn't be deleted. Please try again.");
  for (const p of photos ?? []) await deleteMediaIfUnused(db, ranchId, p.media_id);
  return ok({ name: animal.name });
}

// ─── Photos ──────────────────────────────────────────────────────────────────
/** Step 1: reserve a photo and get a one-time upload URL (the browser uploads directly). */
export async function startPhotoUpload(
  db: Db,
  ranchId: string,
): Promise<Result<{ mediaId: string; path: string; token: string }>> {
  const mediaId = crypto.randomUUID();
  const path = `${ranchId}/${mediaId}/original.jpg`;
  const { error } = await db
    .from("media")
    .insert({ id: mediaId, ranch_id: ranchId, status: "processing", original_path: path });
  if (error) return dbFail(error);
  const { data, error: signError } = await db.storage.from("ranch-originals").createSignedUploadUrl(path);
  if (signError || !data) return fail("Couldn't start the upload. Please try again.");
  return ok({ mediaId, path, token: data.token });
}

/** Step 2: make web sizes, then attach the photo to the animal. */
export async function finishPhotoUpload(
  db: Db,
  ranchId: string,
  mediaId: string,
  opts: { animalId: string; takenAt?: string | null; altText?: string | null },
): Promise<Result<{ mediaId: string }>> {
  const { data: media, error } = await db.from("media").select("original_path").eq("id", mediaId).maybeSingle();
  if (error) return dbFail(error);
  if (!media?.original_path) return fail("That upload could not be found.");

  const { data: file, error: downloadError } = await db.storage.from("ranch-originals").download(media.original_path);
  if (downloadError || !file) return fail("The photo didn't finish uploading. Please try again.");

  try {
    const processed = await processImage(Buffer.from(await file.arrayBuffer()));
    const variants: Record<string, { path: string; w: number; h: number }> = {};
    for (const v of processed.variants) {
      const path = `${ranchId}/${mediaId}/${v.width}.webp`;
      const { error: uploadError } = await db.storage
        .from("ranch-media")
        .upload(path, v.data, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
      if (uploadError) throw uploadError;
      variants[String(v.width)] = { path, w: v.width, h: v.height };
    }
    const { error: updateError } = await db
      .from("media")
      .update({
        status: "ready",
        variants,
        width: processed.width,
        height: processed.height,
        bytes: file.size,
        mime_type: file.type || "image/jpeg",
        blur_data_url: processed.blurDataUrl,
        taken_at: opts.takenAt ?? processed.takenAt,
        alt_text: opts.altText ?? null,
      })
      .eq("id", mediaId);
    if (updateError) return dbFail(updateError);
  } catch {
    await db.from("media").update({ status: "failed" }).eq("id", mediaId);
    return fail("We couldn't read that photo. Try a JPEG or PNG, or take a screenshot of it and upload that.");
  }

  const { data: last } = await db
    .from("animal_media")
    .select("sort_order")
    .eq("animal_id", opts.animalId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error: attachError } = await db.from("animal_media").insert({
    ranch_id: ranchId,
    animal_id: opts.animalId,
    media_id: mediaId,
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  return attachError ? dbFail(attachError) : ok({ mediaId });
}

export async function setMainPhoto(db: Db, animalId: string, mediaId: string): Promise<Result> {
  return changed(await db.from("animals").update({ primary_media_id: mediaId }).eq("id", animalId).select("id"));
}

export async function reorderPhotos(db: Db, animalId: string, mediaIds: string[]): Promise<Result> {
  const { error } = await db.rpc("reorder_animal_photos", { p_animal: animalId, p_media: mediaIds });
  return error ? dbFail(error) : ok(null);
}

export async function updatePhoto(
  db: Db,
  mediaId: string,
  input: { alt_text?: string | null; focal_x?: number; focal_y?: number },
): Promise<Result> {
  const clamp = (n: number | undefined) =>
    n === undefined ? undefined : Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
  return changed(
    await db
      .from("media")
      .update({ alt_text: input.alt_text, focal_x: clamp(input.focal_x), focal_y: clamp(input.focal_y) })
      .eq("id", mediaId)
      .select("id"),
  );
}

/** Removes the photo from this animal; deletes the file too if nothing else uses it. */
export async function removePhoto(db: Db, ranchId: string, animalId: string, mediaId: string): Promise<Result> {
  const { error } = await db.from("animal_media").delete().eq("animal_id", animalId).eq("media_id", mediaId);
  if (error) return dbFail(error);
  await deleteMediaIfUnused(db, ranchId, mediaId);
  return ok(null);
}

export async function deleteMediaIfUnused(db: Db, ranchId: string, mediaId: string): Promise<void> {
  const counts = await Promise.all([
    db.from("animal_media").select("media_id", { count: "exact", head: true }).eq("media_id", mediaId),
    db.from("post_media").select("media_id", { count: "exact", head: true }).eq("media_id", mediaId),
    db.from("posts").select("id", { count: "exact", head: true }).eq("featured_media_id", mediaId),
    db.from("hero_slides").select("id", { count: "exact", head: true }).eq("media_id", mediaId),
  ]);
  if (counts.some((c) => c.error || (c.count ?? 0) > 0)) return;
  const { data: media } = await db
    .from("media")
    .select("in_gallery, original_path, variants")
    .eq("id", mediaId)
    .maybeSingle();
  if (!media || media.in_gallery) return;
  const variantPaths = Object.values((media.variants ?? {}) as Record<string, { path: string }>).map((v) => v.path);
  if (variantPaths.length) await db.storage.from("ranch-media").remove(variantPaths);
  if (media.original_path) await db.storage.from("ranch-originals").remove([media.original_path]);
  await db.from("media").delete().eq("id", mediaId).eq("ranch_id", ranchId);
}
