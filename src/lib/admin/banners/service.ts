/** Reading and saving page banners. Plain functions over the owner's Supabase client, so RLS applies. */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import { isBannerKey, tidyBanner, type BannerInput } from "./pages";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type BannerRow = { headline: string; subheadline: string; mediaId: string | null; thumb: string | null };

/** Every banner the ranch has set, by page key. A page with no entry has none. */
export async function loadBanners(db: Db, ranchId: string): Promise<Result<Record<string, BannerRow>>> {
  const { data, error } = await db
    .from("page_banners")
    .select("page_key, headline, subheadline, media_id")
    .eq("ranch_id", ranchId);
  if (error) return fail(dbErrorMessage(error));
  const mediaIds = (data ?? []).map((b) => b.media_id).filter((id): id is string => Boolean(id));
  const thumbs = new Map<string, string>();
  if (mediaIds.length) {
    const { data: media } = await db.from("media").select("id, variants").in("id", mediaIds);
    for (const m of media ?? []) {
      const v = pickVariant(m.variants as Json, 480);
      if (v) thumbs.set(m.id, mediaUrl(v.path));
    }
  }
  return ok(
    Object.fromEntries(
      (data ?? []).map((b) => [
        b.page_key,
        {
          headline: b.headline ?? "",
          subheadline: b.subheadline ?? "",
          mediaId: b.media_id,
          thumb: b.media_id ? (thumbs.get(b.media_id) ?? null) : null,
        },
      ]),
    ),
  );
}

/** Saves one page's banner. With nothing set, the row is removed and the page uses its own title again. */
export async function saveBanner(db: Db, ranchId: string, key: string, input: BannerInput): Promise<Result> {
  if (!isBannerKey(key)) return fail("That page doesn't have a banner.");
  const b = tidyBanner(input);
  if (!b.headline && !b.subheadline && !b.mediaId) {
    const { error } = await db.from("page_banners").delete().eq("ranch_id", ranchId).eq("page_key", key);
    return error ? fail(dbErrorMessage(error)) : ok(null);
  }
  const { error } = await db
    .from("page_banners")
    .upsert(
      { ranch_id: ranchId, page_key: key, headline: b.headline, subheadline: b.subheadline, media_id: b.mediaId },
      { onConflict: "ranch_id,page_key" },
    );
  return error ? fail(dbErrorMessage(error)) : ok(null);
}
