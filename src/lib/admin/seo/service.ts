/** Reading and saving each page's search-engine text. Plain functions over the owner's client, so RLS applies. */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";
import { isBannerKey } from "@/lib/admin/banners/pages";
import { mediaUrl, pickVariant } from "@/lib/media/variants";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type SeoRow = {
  metaTitle: string;
  metaDescription: string;
  focusPhrase: string;
  ogMediaId: string | null;
  ogThumb: string | null;
};
export type SeoInput = { metaTitle: string; metaDescription: string; focusPhrase: string; ogMediaId: string | null };

export const isSeoKey = (key: string) => key === "home" || isBannerKey(key);

const squash = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);

export async function loadSeo(db: Db, ranchId: string): Promise<Result<Record<string, SeoRow>>> {
  const { data, error } = await db
    .from("page_seo")
    .select("page_key, meta_title, meta_description, focus_phrase, og_media_id")
    .eq("ranch_id", ranchId);
  // Before the search-engine update is applied the table doesn't exist; say so instead of showing a blank screen.
  if (error) return fail(dbErrorMessage(error));
  const ids = (data ?? []).map((r) => r.og_media_id).filter((id): id is string => Boolean(id));
  const thumbs = new Map<string, string>();
  if (ids.length) {
    const { data: media } = await db.from("media").select("id, variants").in("id", ids);
    for (const m of media ?? []) {
      const v = pickVariant(m.variants as Json, 480);
      if (v) thumbs.set(m.id, mediaUrl(v.path));
    }
  }
  return ok(
    Object.fromEntries(
      (data ?? []).map((r) => [
        r.page_key,
        {
          metaTitle: r.meta_title ?? "",
          metaDescription: r.meta_description ?? "",
          focusPhrase: r.focus_phrase ?? "",
          ogMediaId: r.og_media_id,
          ogThumb: r.og_media_id ? (thumbs.get(r.og_media_id) ?? null) : null,
        },
      ]),
    ),
  );
}

/** Saves one page's text. With nothing set, the row is removed and the page uses its defaults again. */
export async function saveSeo(db: Db, ranchId: string, key: string, input: SeoInput): Promise<Result> {
  if (!isSeoKey(key)) return fail("That page can't have search-engine text.");
  const row = {
    meta_title: squash(input.metaTitle, 70) || null,
    meta_description: squash(input.metaDescription, 200) || null,
    focus_phrase: squash(input.focusPhrase, 80) || null,
    og_media_id: input.ogMediaId,
  };
  if (!row.meta_title && !row.meta_description && !row.focus_phrase && !row.og_media_id) {
    const { error } = await db.from("page_seo").delete().eq("ranch_id", ranchId).eq("page_key", key);
    return error ? fail(dbErrorMessage(error)) : ok(null);
  }
  const { error } = await db
    .from("page_seo")
    .upsert({ ranch_id: ranchId, page_key: key, ...row }, { onConflict: "ranch_id,page_key" });
  return error ? fail(dbErrorMessage(error)) : ok(null);
}
