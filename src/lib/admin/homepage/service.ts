/** Reading and saving the homepage slides. Plain functions over the owner's Supabase client, so RLS applies. */
import type { Database, Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import { tidySlides, type SlideInput } from "./fields";

type SitePage = Database["public"]["Enums"]["site_page"];
const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type SlideForm = SlideInput & { thumb: string | null; animalName: string | null };

export async function loadSlides(db: Db, ranchId: string): Promise<Result<SlideForm[]>> {
  const { data, error } = await db
    .from("hero_slides")
    .select(
      "id, media_id, headline, subheadline, cta_label, cta_kind, cta_page, cta_category_id, cta_animal_id, cta_url, is_active, sort_order",
    )
    .eq("ranch_id", ranchId)
    .is("archived_at", null)
    .order("sort_order")
    .limit(10);
  if (error) return fail(dbErrorMessage(error));
  const mediaIds = data.map((s) => s.media_id).filter((id): id is string => Boolean(id));
  const animalIds = data.map((s) => s.cta_animal_id).filter((id): id is string => Boolean(id));
  const [media, animals] = await Promise.all([
    mediaIds.length ? db.from("media").select("id, variants").in("id", mediaIds) : Promise.resolve({ data: [] }),
    animalIds.length ? db.from("animals").select("id, name").in("id", animalIds) : Promise.resolve({ data: [] }),
  ]);
  const thumbs = new Map(
    (media.data ?? []).map((m) => {
      const v = pickVariant(m.variants as Json, 480);
      return [m.id, v ? mediaUrl(v.path) : null] as const;
    }),
  );
  const names = new Map((animals.data ?? []).map((a) => [a.id, a.name]));
  return ok(
    data.map((s) => ({
      id: s.id,
      mediaId: s.media_id,
      headline: s.headline,
      subheadline: s.subheadline ?? "",
      ctaLabel: s.cta_label ?? "",
      ctaKind: s.cta_kind,
      ctaPage: s.cta_page ?? "",
      ctaCategoryId: s.cta_category_id,
      ctaAnimalId: s.cta_animal_id,
      ctaUrl: s.cta_url ?? "",
      isActive: s.is_active,
      thumb: s.media_id ? (thumbs.get(s.media_id) ?? null) : null,
      animalName: s.cta_animal_id ? (names.get(s.cta_animal_id) ?? null) : null,
    })),
  );
}

/**
 * Saves the slides as the owner left them, in order. Slides taken out are archived first, so the
 * three-slide limit is never in the way of the ones being changed or added.
 */
export async function saveSlides(db: Db, ranchId: string, input: SlideInput[]): Promise<Result> {
  const tidy = tidySlides(input);
  if (!tidy.ok) return fail(tidy.message);

  const { data: existing, error } = await db
    .from("hero_slides")
    .select("id")
    .eq("ranch_id", ranchId)
    .is("archived_at", null);
  if (error) return fail(dbErrorMessage(error));
  const keep = new Set(input.map((s) => s.id).filter((id): id is string => Boolean(id)));
  const removed = (existing ?? []).map((s) => s.id).filter((id) => !keep.has(id));
  if (removed.length) {
    const r = await db
      .from("hero_slides")
      .update({ archived_at: new Date().toISOString(), is_active: false })
      .eq("ranch_id", ranchId)
      .in("id", removed);
    if (r.error) return fail(dbErrorMessage(r.error));
  }

  // Switch off what is being turned off, then change and add the rest.
  const rows = tidy.slides.map((s, i) => ({
    ...s,
    cta_page: s.cta_page as SitePage | null,
    sort_order: i,
    id: input[i].id,
  }));
  for (const r of rows.filter((x) => x.id && !x.is_active)) {
    const { id, ...fields } = r;
    const u = await db.from("hero_slides").update(fields).eq("id", id!).eq("ranch_id", ranchId);
    if (u.error) return fail(dbErrorMessage(u.error));
  }
  for (const r of rows.filter((x) => x.is_active)) {
    const { id, ...fields } = r;
    const res = id
      ? await db.from("hero_slides").update(fields).eq("id", id).eq("ranch_id", ranchId)
      : await db.from("hero_slides").insert({ ...fields, ranch_id: ranchId });
    if (res.error) return fail(dbErrorMessage(res.error));
  }
  for (const r of rows.filter((x) => !x.id && !x.is_active)) {
    const { id: _id, ...fields } = r;
    void _id;
    const res = await db.from("hero_slides").insert({ ...fields, ranch_id: ranchId });
    if (res.error) return fail(dbErrorMessage(res.error));
  }
  return ok(null);
}
