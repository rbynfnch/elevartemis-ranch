/** Reading and saving the ranch's own details (tagline, story, phone, place, links). Plain functions over the owner's client. */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";
import { tidyInfo, type Platform, type RanchInfoInput } from "./fields";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type RanchInfoForm = Omit<RanchInfoInput, "social"> & {
  social: { platform: Platform; url: string; label: string }[];
};

export async function loadRanchInfo(db: Db, ranchId: string): Promise<Result<RanchInfoForm>> {
  const [profile, social, blog] = await Promise.all([
    db
      .from("ranch_profile")
      .select("tagline, intro, public_phone, city, region, address_display, hours_text")
      .eq("ranch_id", ranchId)
      .maybeSingle(),
    db.from("social_links").select("platform, url, label, sort_order").eq("ranch_id", ranchId).order("sort_order"),
    // A later update; absent before it is applied.
    db.from("ranch_profile").select("blog_label").eq("ranch_id", ranchId).maybeSingle(),
  ]);
  if (profile.error) return fail(dbErrorMessage(profile.error));
  if (social.error) return fail(dbErrorMessage(social.error));
  const p = profile.data;
  return ok({
    tagline: p?.tagline ?? "",
    intro: p?.intro ?? null,
    publicPhone: p?.public_phone ?? "",
    city: p?.city ?? "",
    region: p?.region ?? "",
    addressDisplay: p?.address_display ?? "",
    hoursText: p?.hours_text ?? "",
    blogLabel: blog.error ? "" : (blog.data?.blog_label ?? ""),
    social: (social.data ?? []).map((s) => ({ platform: s.platform as Platform, url: s.url, label: s.label ?? "" })),
  });
}

export async function saveRanchInfo(db: Db, ranchId: string, input: RanchInfoInput): Promise<Result> {
  const t = tidyInfo(input);
  if (!t.ok) return fail(t.message);
  const { info } = t;

  const profile = await db
    .from("ranch_profile")
    .update({ ...info.profile, intro: (input.intro ?? null) as Json | null })
    .eq("ranch_id", ranchId)
    .select("ranch_id");
  if (profile.error) return fail(dbErrorMessage(profile.error));
  if (!profile.data?.length) return fail("Your ranch details could not be found. Refresh and try again.");

  // The blog's name is a later update; until it is applied, everything else still saves.
  const blog = await db.from("ranch_profile").update({ blog_label: info.blogLabel }).eq("ranch_id", ranchId);
  if (blog.error && !/blog_label/.test(blog.error.message)) return fail(dbErrorMessage(blog.error));

  // Links are replaced as a set.
  const cleared = await db.from("social_links").delete().eq("ranch_id", ranchId);
  if (cleared.error) return fail(dbErrorMessage(cleared.error));
  if (info.social.length) {
    const added = await db.from("social_links").insert(info.social.map((s) => ({ ...s, ranch_id: ranchId })));
    if (added.error) return fail(dbErrorMessage(added.error));
  }
  return ok(null);
}
