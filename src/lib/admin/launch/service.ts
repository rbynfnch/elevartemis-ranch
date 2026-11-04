/** Gathering the facts for the launch checklist, and the go-live step. */
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";
import { createServiceSupabase } from "@/lib/supabase/service";
import { canGoLive, launchChecks, type LaunchCheck, type LaunchFacts } from "./checks";
import { parseAbout, aboutIsEmpty } from "@/lib/site/about";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export async function loadLaunch(db: Db, ranchId: string): Promise<Result<{ checks: LaunchCheck[]; live: boolean }>> {
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const [ranch, profile, priv, shown, noPhoto, samples, slides, about, homeSeo, posts] = await Promise.all([
    db.from("ranches").select("status").eq("id", ranchId).maybeSingle(),
    db.from("ranch_profile").select("tagline, public_phone").eq("ranch_id", ranchId).maybeSingle(),
    db.from("ranch_private").select("inquiry_email").eq("ranch_id", ranchId).maybeSingle(),
    count(
      db
        .from("animals")
        .select("id", { count: "exact", head: true })
        .eq("ranch_id", ranchId)
        .eq("record_scope", "inventory")
        .eq("is_published", true)
        .is("archived_at", null),
    ),
    count(
      db
        .from("animals")
        .select("id", { count: "exact", head: true })
        .eq("ranch_id", ranchId)
        .eq("record_scope", "inventory")
        .eq("is_published", true)
        .is("archived_at", null)
        .is("primary_media_id", null),
    ),
    count(
      db
        .from("animals")
        .select("id", { count: "exact", head: true })
        .eq("ranch_id", ranchId)
        .eq("record_scope", "inventory")
        .eq("is_demo", true)
        .is("archived_at", null),
    ),
    count(
      db
        .from("hero_slides")
        .select("id", { count: "exact", head: true })
        .eq("ranch_id", ranchId)
        .eq("is_active", true)
        .is("archived_at", null),
    ),
    db.from("pages").select("sections").eq("ranch_id", ranchId).eq("key", "about").maybeSingle(),
    // Later update: absent before it is applied.
    count(
      db
        .from("page_seo")
        .select("page_key", { count: "exact", head: true })
        .eq("ranch_id", ranchId)
        .eq("page_key", "home"),
    ),
    count(
      db
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("ranch_id", ranchId)
        .eq("status", "published")
        .is("archived_at", null),
    ),
  ]);
  if (ranch.error) return fail(dbErrorMessage(ranch.error));
  const facts: LaunchFacts = {
    tagline: Boolean(profile.data?.tagline),
    phone: Boolean(profile.data?.public_phone),
    publishedAnimals: shown,
    animalsWithoutPhoto: noPhoto,
    sampleAnimals: samples,
    homepageSlides: slides,
    aboutFilled: !aboutIsEmpty(parseAbout(about.data?.sections)),
    messageEmail: Boolean(priv.data?.inquiry_email),
    homeSeoWritten: homeSeo > 0,
    publishedPosts: posts,
  };
  return ok({ checks: launchChecks(facts), live: ranch.data?.status === "live" });
}

/**
 * Publishes the site: the ranch goes live and search engines are allowed in. Only an owner may do it, and only
 * when the required items are done. This uses the service client because ranches and SEO settings are not
 * writable by owners directly; the owner's own checks above are what authorise it.
 */
export async function goLive(db: Db, ranchId: string, isOwner: boolean): Promise<Result> {
  if (!isOwner) return fail("Only the ranch's owner can take the site live.");
  const loaded = await loadLaunch(db, ranchId);
  if (!loaded.ok) return loaded;
  if (loaded.data.live) return ok(null);
  if (!canGoLive(loaded.data.checks)) return fail("A few required items still need attention. Finish them first.");
  const admin = createServiceSupabase();
  const { data: row } = await admin.from("ranches").select("status").eq("id", ranchId).maybeSingle();
  // A suspended ranch is the platform's to bring back, never the owner's.
  if (row?.status === "suspended") return fail("This site is paused. Please contact us.");
  const a = await admin.from("ranches").update({ status: "live" }).eq("id", ranchId);
  if (a.error) return fail(dbErrorMessage(a.error));
  const b = await admin.from("ranch_seo").update({ noindex: false }).eq("ranch_id", ranchId);
  if (b.error) return fail(dbErrorMessage(b.error));
  return ok(null);
}
