/**
 * Everything the blog dashboard and editor do with posts. Plain functions over the owner's Supabase client, so
 * row-level security applies to every call.
 *
 * How saving works:
 *  - A DRAFT writes straight to the post.
 *  - A post that is LIVE or SCHEDULED keeps what visitors see untouched. Edits wait in `draft_data` (the "working
 *    copy") until the owner presses Update, so a half-finished edit never reaches the public site.
 *  - Every save carries the version it was based on (`updated_at`). If someone else saved in between, the save is
 *    refused instead of silently overwriting; a repeat of a save that already went through is accepted.
 */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import { collectMediaIds, type Doc } from "@/lib/blog/content";
import { deriveStatus, utcToZonedLocal, type PostStatus } from "@/lib/blog/schedule";
import { speciesTerms } from "@/lib/domain/species";
import { slugify } from "@/lib/admin/posts/fields";
import {
  emptySnapshot,
  parseSnapshot,
  sameSnapshot,
  snapshotFromInput,
  type PostInput,
  type PostSnapshot,
} from "./snapshot";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

const KEEP_REVISIONS = 50;
const AUTOSAVE_REVISION_GAP_MS = 10 * 60 * 1000;
const UNTITLED = "Untitled post";

export const SUGGESTED_CATEGORIES = [
  { name: "Ranch Life", slug: "ranch-life" },
  { name: "Our Horses", slug: "our-horses" },
  { name: "Our Cattle", slug: "our-cattle" },
  { name: "For Sale & New Arrivals", slug: "for-sale-new-arrivals" },
  { name: "Ranch News", slug: "ranch-news" },
  { name: "Seasonal Updates", slug: "seasonal-updates" },
] as const;

const thumbOf = (variants: unknown) => {
  const v = pickVariant(variants as Json, 480);
  return v ? mediaUrl(v.path) : null;
};

const CONFLICT =
  "This post was changed somewhere else (another tab or person). Reload the page to get the latest version before saving.";

// ─── Reading ────────────────────────────────────────────────────────────────

export type PostFilters = {
  q?: string;
  status?: PostStatus | "all" | "trash";
  categoryId?: string;
  author?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  page?: number;
};

export type PostCard = {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  publishedAt: string | null;
  updatedAt: string;
  deletedAt: string | null;
  categoryName: string | null;
  author: string;
  thumb: string | null;
  hasWorkingCopy: boolean;
};

export const PAGE_SIZE = 20;

/** Characters that would change the meaning of a search filter are removed. */
const searchTerm = (q: string) => q.replace(/[%,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

export async function listPosts(
  db: Db,
  ranchId: string,
  f: PostFilters,
): Promise<Result<{ posts: PostCard[]; total: number; page: number; pages: number }>> {
  const now = new Date().toISOString();
  const page = Math.max(1, Math.floor(f.page ?? 1));
  let query = db
    .from("posts")
    .select(
      "id, title, slug, status, published_at, updated_at, archived_at, deleted_at, category_id, featured_media_id, author_name, draft_data",
      { count: "exact" },
    )
    .eq("ranch_id", ranchId);

  const status = f.status ?? "all";
  if (status === "trash") query = query.not("deleted_at", "is", null);
  else {
    query = query.is("deleted_at", null);
    if (status === "archived") query = query.not("archived_at", "is", null);
    else {
      query = query.is("archived_at", null);
      if (status === "draft") query = query.eq("status", "draft");
      if (status === "published") query = query.eq("status", "published").lte("published_at", now);
      if (status === "scheduled") query = query.eq("status", "published").gt("published_at", now);
    }
  }
  const term = searchTerm(f.q ?? "");
  if (term) query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%,excerpt.ilike.%${term}%`);
  if (f.categoryId) query = query.eq("category_id", f.categoryId);
  if (f.author) query = query.eq("author_name", f.author);
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) query = query.gte("updated_at", f.from);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) query = query.lte("updated_at", `${f.to}T23:59:59.999Z`);

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) return fail(dbErrorMessage(error));

  const mediaIds = data.map((p) => p.featured_media_id).filter((id): id is string => Boolean(id));
  const [cats, media] = await Promise.all([
    db.from("post_categories").select("id, name").eq("ranch_id", ranchId),
    mediaIds.length ? db.from("media").select("id, variants").in("id", mediaIds) : Promise.resolve({ data: [] }),
  ]);
  const catName = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
  const thumbs = new Map((media.data ?? []).map((m) => [m.id, thumbOf(m.variants)]));
  const total = count ?? data.length;
  return ok({
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    posts: data.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: deriveStatus(p),
      publishedAt: p.published_at,
      updatedAt: p.updated_at,
      deletedAt: p.deleted_at,
      categoryName: p.category_id ? (catName.get(p.category_id) ?? null) : null,
      author: p.author_name ?? "",
      thumb: p.featured_media_id ? (thumbs.get(p.featured_media_id) ?? null) : null,
      hasWorkingCopy: p.draft_data !== null,
    })),
  });
}

export type PostCounts = Record<"all" | "draft" | "scheduled" | "published" | "archived" | "trash", number>;

export async function postCounts(db: Db, ranchId: string): Promise<PostCounts> {
  const now = new Date().toISOString();
  const base = () => db.from("posts").select("id", { count: "exact", head: true }).eq("ranch_id", ranchId);
  const live = () => base().is("deleted_at", null).is("archived_at", null);
  const [all, draft, scheduled, published, archived, trash] = await Promise.all([
    live(),
    live().eq("status", "draft"),
    live().eq("status", "published").gt("published_at", now),
    live().eq("status", "published").lte("published_at", now),
    base().is("deleted_at", null).not("archived_at", "is", null),
    base().not("deleted_at", "is", null),
  ]);
  const n = (r: { count: number | null }) => r.count ?? 0;
  return {
    all: n(all),
    draft: n(draft),
    scheduled: n(scheduled),
    published: n(published),
    archived: n(archived),
    trash: n(trash),
  };
}

export async function listAuthors(db: Db, ranchId: string): Promise<string[]> {
  const { data } = await db
    .from("posts")
    .select("author_name")
    .eq("ranch_id", ranchId)
    .not("author_name", "is", null)
    .limit(500);
  return [...new Set((data ?? []).map((r) => r.author_name).filter((n): n is string => Boolean(n)))].sort();
}

export type Taxonomy = {
  categories: { id: string; name: string; slug: string; count: number }[];
  tags: { id: string; name: string; slug: string; count: number }[];
};

export async function getTaxonomy(db: Db, ranchId: string): Promise<Taxonomy> {
  const [cats, tags, posts, links] = await Promise.all([
    db.from("post_categories").select("id, name, slug").eq("ranch_id", ranchId).order("sort_order").order("name"),
    db.from("post_tags").select("id, name, slug").eq("ranch_id", ranchId).order("name"),
    db.from("posts").select("category_id").eq("ranch_id", ranchId).is("deleted_at", null).limit(2000),
    db.from("post_tag_links").select("tag_id").eq("ranch_id", ranchId).limit(5000),
  ]);
  const tally = (items: (string | null | undefined)[]) => {
    const m = new Map<string, number>();
    for (const i of items) if (i) m.set(i, (m.get(i) ?? 0) + 1);
    return m;
  };
  const catCount = tally((posts.data ?? []).map((p) => p.category_id));
  const tagCount = tally((links.data ?? []).map((l) => l.tag_id));
  return {
    categories: (cats.data ?? []).map((c) => ({ ...c, count: catCount.get(c.id) ?? 0 })),
    // The tags table does not exist before the blog update; the editor then simply has no tags.
    tags: tags.error ? [] : (tags.data ?? []).map((t) => ({ ...t, count: tagCount.get(t.id) ?? 0 })),
  };
}

type PostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: Json | null;
  featured_media_id: string | null;
  category_id: string | null;
  status: "draft" | "published";
  published_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  updated_at: string;
  author_name: string | null;
  show_author: boolean;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_media_id: string | null;
  draft_data: Json | null;
  draft_saved_at: string | null;
};

const COLUMNS =
  "id, title, slug, excerpt, body, featured_media_id, category_id, status, published_at, archived_at, deleted_at, updated_at, author_name, show_author, meta_title, meta_description, og_title, og_description, og_media_id, draft_data, draft_saved_at";

async function loadRow(db: Db, ranchId: string, id: string): Promise<Result<PostRow>> {
  const { data, error } = await db.from("posts").select(COLUMNS).eq("ranch_id", ranchId).eq("id", id).maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("That post could not be found.");
  return ok(data as unknown as PostRow);
}

/** The post exactly as visitors get it, including what it is linked to. */
async function liveSnapshot(db: Db, ranchId: string, row: PostRow): Promise<PostSnapshot> {
  const [tags, related, animals] = await Promise.all([
    db.from("post_tag_links").select("tag_id").eq("post_id", row.id),
    db.from("post_related").select("related_post_id, sort_order").eq("post_id", row.id).order("sort_order"),
    db.from("post_animals").select("animal_id").eq("post_id", row.id),
  ]);
  const base = emptySnapshot();
  return parseSnapshot({
    ...base,
    title: row.title === UNTITLED ? "" : row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? "",
    body: row.body,
    featuredMediaId: row.featured_media_id,
    categoryId: row.category_id,
    tagIds: (tags.data ?? []).map((t) => t.tag_id),
    authorName: row.author_name ?? "",
    showAuthor: row.show_author,
    publishedAt: row.published_at,
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    ogTitle: row.og_title ?? "",
    ogDescription: row.og_description ?? "",
    ogMediaId: row.og_media_id,
    relatedIds: (related.data ?? []).map((r) => r.related_post_id),
    animalIds: (animals.data ?? []).map((a) => a.animal_id),
  });
}

export type EditorData = {
  id: string;
  status: PostStatus;
  /** True when the post is live or scheduled and the editor shows unpublished changes. */
  hasWorkingCopy: boolean;
  version: string;
  draftSavedAt: string | null;
  timeZone: string;
  /** What the editor starts with (the working copy if there is one). */
  snapshot: PostSnapshot;
  /** The local date/time text for the schedule field. */
  publishedLocal: string;
  liveSlug: string | null;
  wasLive: boolean;
  thumbs: Record<string, string | null>;
  titles: Record<string, string>;
  animalNames: Record<string, string>;
};

export async function getEditorData(db: Db, ranchId: string, id: string): Promise<Result<EditorData>> {
  const row = await loadRow(db, ranchId, id);
  if (!row.ok) return row;
  const p = row.data;
  const [{ data: profile }, live] = await Promise.all([
    db.from("ranch_profile").select("time_zone").eq("ranch_id", ranchId).maybeSingle(),
    liveSnapshot(db, ranchId, p),
  ]);
  const hasWorkingCopy = p.status === "published" && p.draft_data !== null && !p.archived_at;
  const snapshot = hasWorkingCopy ? parseSnapshot(p.draft_data) : live;
  const tz = profile?.time_zone ?? "America/Denver";

  const mediaIds = [snapshot.featuredMediaId, snapshot.ogMediaId, ...collectMediaIds(snapshot.body)].filter(
    (x): x is string => Boolean(x),
  );
  const [media, animals, related] = await Promise.all([
    mediaIds.length ? db.from("media").select("id, variants").in("id", [...new Set(mediaIds)]) : { data: [] },
    snapshot.animalIds.length ? db.from("animals").select("id, name").in("id", snapshot.animalIds) : { data: [] },
    snapshot.relatedIds.length ? db.from("posts").select("id, title").in("id", snapshot.relatedIds) : { data: [] },
  ]);
  return ok({
    id: p.id,
    status: deriveStatus(p),
    hasWorkingCopy,
    version: p.updated_at,
    draftSavedAt: p.draft_saved_at,
    timeZone: tz,
    snapshot,
    publishedLocal: snapshot.publishedAt ? utcToZonedLocal(snapshot.publishedAt, tz) : "",
    liveSlug: p.status === "published" ? p.slug : null,
    wasLive: p.status === "published" && p.published_at !== null,
    thumbs: Object.fromEntries((media.data ?? []).map((m) => [m.id, thumbOf(m.variants)])),
    titles: Object.fromEntries((related.data ?? []).map((r) => [r.id, r.title])),
    animalNames: Object.fromEntries((animals.data ?? []).map((a) => [a.id, a.name])),
  });
}

// ─── Writing ────────────────────────────────────────────────────────────────

/** All photos a snapshot uses, so none can be deleted from the library while a post needs it. */
const mediaOf = (s: PostSnapshot) =>
  [...collectMediaIds(s.body), s.featuredMediaId, s.ogMediaId].filter((x): x is string => Boolean(x));

async function syncRefs(db: Db, ranchId: string, postId: string, ids: string[]): Promise<Result> {
  const wanted = [...new Set(ids)];
  const { data: valid, error } = wanted.length
    ? await db.from("media").select("id").eq("ranch_id", ranchId).in("id", wanted)
    : { data: [], error: null };
  if (error) return fail(dbErrorMessage(error));
  const keep = (valid ?? []).map((m) => m.id);
  const del = db.from("post_media_refs").delete().eq("post_id", postId);
  const cleared = keep.length ? await del.not("media_id", "in", `(${keep.join(",")})`) : await del;
  if (cleared.error) return fail(dbErrorMessage(cleared.error));
  if (keep.length) {
    const r = await db
      .from("post_media_refs")
      .upsert(
        keep.map((media_id) => ({ ranch_id: ranchId, post_id: postId, media_id })),
        { onConflict: "post_id,media_id", ignoreDuplicates: true },
      );
    if (r.error) return fail(dbErrorMessage(r.error));
  }
  return ok(null);
}

async function replaceLinks(db: Db, ranchId: string, postId: string, s: PostSnapshot): Promise<Result> {
  const cleared = await Promise.all([
    db.from("post_tag_links").delete().eq("post_id", postId),
    db.from("post_related").delete().eq("post_id", postId),
    db.from("post_animals").delete().eq("post_id", postId),
  ]);
  for (const c of cleared) if (c.error) return fail(dbErrorMessage(c.error));
  const writes = [];
  if (s.tagIds.length)
    writes.push(
      db.from("post_tag_links").insert(s.tagIds.map((tag_id) => ({ ranch_id: ranchId, post_id: postId, tag_id }))),
    );
  const related = s.relatedIds.filter((r) => r !== postId);
  if (related.length)
    writes.push(
      db
        .from("post_related")
        .insert(related.map((related_post_id, i) => ({ ranch_id: ranchId, post_id: postId, related_post_id, sort_order: i }))),
    );
  if (s.animalIds.length)
    writes.push(
      db.from("post_animals").insert(s.animalIds.map((animal_id) => ({ ranch_id: ranchId, post_id: postId, animal_id }))),
    );
  for (const w of await Promise.all(writes)) if (w.error) return fail(dbErrorMessage(w.error));
  return ok(null);
}

type Reason = "save" | "autosave" | "publish" | "update" | "restore" | "duplicate";

async function addRevision(
  db: Db,
  ranchId: string,
  postId: string,
  userId: string | null,
  reason: Reason,
  s: PostSnapshot,
) {
  if (reason === "autosave") {
    // Autosaves would fill the history in minutes; one is kept every ten minutes.
    const { data: last } = await db
      .from("post_revisions")
      .select("created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last && Date.now() - Date.parse(last.created_at) < AUTOSAVE_REVISION_GAP_MS) return;
  }
  const r = await db
    .from("post_revisions")
    .insert({ ranch_id: ranchId, post_id: postId, created_by: userId, reason, snapshot: s as unknown as Json });
  if (r.error) return; // History is a safety net; a failure here must not lose the save itself.
  const { data: old } = await db
    .from("post_revisions")
    .select("id")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .range(KEEP_REVISIONS, KEEP_REVISIONS + 200);
  if (old?.length)
    await db
      .from("post_revisions")
      .delete()
      .in(
        "id",
        old.map((o) => o.id),
      );
}

const slugTaken = "Another post already uses that web address. Change it a little.";

/** Puts a snapshot into the post's own columns (what visitors see once it is live). */
async function applyToColumns(
  db: Db,
  ranchId: string,
  userId: string | null,
  id: string,
  s: PostSnapshot,
  status: "draft" | "published",
  base: string,
): Promise<Result<{ version: string; slug: string }>> {
  const res = await db
    .from("posts")
    .update({
      title: s.title || UNTITLED,
      // An empty address is filled in by the database from the title.
      slug: s.slug,
      excerpt: s.excerpt || null,
      body: s.body as unknown as Json,
      featured_media_id: s.featuredMediaId,
      category_id: s.categoryId,
      author_name: s.authorName || null,
      show_author: s.showAuthor,
      meta_title: s.metaTitle || null,
      meta_description: s.metaDescription || null,
      og_title: s.ogTitle || null,
      og_description: s.ogDescription || null,
      og_media_id: s.ogMediaId,
      content_version: s.version,
      status,
      ...(s.publishedAt ? { published_at: s.publishedAt } : {}),
      draft_data: null,
      draft_saved_at: null,
      last_edited_by: userId,
    })
    .eq("ranch_id", ranchId)
    .eq("id", id)
    .eq("updated_at", base)
    .select("updated_at, slug");
  if (res.error) return fail(res.error.code === "23505" ? slugTaken : dbErrorMessage(res.error));
  if (!res.data?.length) return fail(CONFLICT);
  const links = await replaceLinks(db, ranchId, id, s);
  if (!links.ok) return links;
  const refs = await syncRefs(db, ranchId, id, mediaOf(s));
  if (!refs.ok) return refs;
  return ok({ version: res.data[0].updated_at, slug: res.data[0].slug });
}

export type SaveOutcome = {
  version: string;
  slug: string;
  status: PostStatus;
  savedAt: string;
  dropped: number;
  hasWorkingCopy: boolean;
};

/** Saves the editor's current state without publishing anything. Used by autosave and "Save draft". */
export async function saveDraft(
  db: Db,
  ranchId: string,
  userId: string | null,
  id: string,
  input: PostInput,
  base: string,
  reason: "save" | "autosave",
): Promise<Result<SaveOutcome>> {
  const row = await loadRow(db, ranchId, id);
  if (!row.ok) return row;
  const p = row.data;
  if (p.deleted_at) return fail("This post is in the trash. Restore it to keep editing.");
  const { data: profile } = await db.from("ranch_profile").select("time_zone").eq("ranch_id", ranchId).maybeSingle();
  const tidy = snapshotFromInput(input, profile?.time_zone ?? "America/Denver");
  if (!tidy.ok) return fail(tidy.message);
  const s = tidy.snapshot;
  const isLive = p.status === "published";
  const savedAt = new Date().toISOString();

  if (p.updated_at !== base) {
    // A retry of a save that already went through is fine; anything else is a real conflict.
    const current = isLive && p.draft_data !== null ? parseSnapshot(p.draft_data) : await liveSnapshot(db, ranchId, p);
    if (sameSnapshot(current, s))
      return ok({
        version: p.updated_at,
        slug: p.slug,
        status: deriveStatus(p),
        savedAt,
        dropped: tidy.dropped,
        hasWorkingCopy: isLive,
      });
    return fail(CONFLICT);
  }

  if (!isLive) {
    const r = await applyToColumns(db, ranchId, userId, id, s, "draft", base);
    if (!r.ok) return r;
    await addRevision(db, ranchId, id, userId, reason, s);
    return ok({
      ...r.data,
      status: p.archived_at ? "archived" : "draft",
      savedAt,
      dropped: tidy.dropped,
      hasWorkingCopy: false,
    });
  }

  const res = await db
    .from("posts")
    .update({ draft_data: s as unknown as Json, draft_saved_at: savedAt, last_edited_by: userId })
    .eq("ranch_id", ranchId)
    .eq("id", id)
    .eq("updated_at", base)
    .select("updated_at");
  if (res.error) return fail(dbErrorMessage(res.error));
  if (!res.data?.length) return fail(CONFLICT);
  // Photos in the working copy are protected from deletion as well.
  const live = await liveSnapshot(db, ranchId, p);
  await syncRefs(db, ranchId, id, [...mediaOf(live), ...mediaOf(s)]);
  await addRevision(db, ranchId, id, userId, reason, s);
  return ok({
    version: res.data[0].updated_at,
    slug: p.slug,
    status: deriveStatus(p),
    savedAt,
    dropped: tidy.dropped,
    hasWorkingCopy: true,
  });
}

/**
 * Publishes now, schedules (a date in the future), or updates a post that is already live with its working copy.
 */
export async function publish(
  db: Db,
  ranchId: string,
  userId: string | null,
  id: string,
  input: PostInput,
  base: string,
): Promise<Result<SaveOutcome>> {
  const row = await loadRow(db, ranchId, id);
  if (!row.ok) return row;
  const p = row.data;
  if (p.deleted_at) return fail("This post is in the trash. Restore it first.");
  if (p.updated_at !== base) return fail(CONFLICT);
  const { data: profile } = await db.from("ranch_profile").select("time_zone").eq("ranch_id", ranchId).maybeSingle();
  const tidy = snapshotFromInput(input, profile?.time_zone ?? "America/Denver", { forPublish: true });
  if (!tidy.ok) return fail(tidy.message);
  const s = tidy.snapshot;

  // Publishing an archived post brings it back.
  if (p.archived_at) {
    const u = await db.from("posts").update({ archived_at: null }).eq("id", id).eq("ranch_id", ranchId).select("updated_at");
    if (u.error || !u.data?.length) return fail(u.error ? dbErrorMessage(u.error) : CONFLICT);
    return publish(db, ranchId, userId, id, input, u.data[0].updated_at);
  }

  const wasLive = p.status === "published";
  const r = await applyToColumns(db, ranchId, userId, id, s, "published", base);
  if (!r.ok) return r;
  await addRevision(db, ranchId, id, userId, wasLive ? "update" : "publish", s);
  const published_at = s.publishedAt ?? p.published_at ?? new Date().toISOString();
  return ok({
    ...r.data,
    status: deriveStatus({ status: "published", published_at, archived_at: null }),
    savedAt: new Date().toISOString(),
    dropped: tidy.dropped,
    hasWorkingCopy: false,
  });
}

/** Takes a post off the site and back to a draft. Edits waiting in a working copy are kept as the draft. */
export async function unpublish(db: Db, ranchId: string, userId: string | null, id: string): Promise<Result> {
  const row = await loadRow(db, ranchId, id);
  if (!row.ok) return row;
  const p = row.data;
  const s = p.draft_data !== null ? parseSnapshot(p.draft_data) : await liveSnapshot(db, ranchId, p);
  const r = await applyToColumns(db, ranchId, userId, id, { ...s, publishedAt: null }, "draft", p.updated_at);
  return r.ok ? ok(null) : r;
}

const touch = async (db: Db, ranchId: string, id: string, patch: { archived_at?: string | null; deleted_at?: string | null; status?: "draft" }): Promise<Result> => {
  const { data, error } = await db.from("posts").update(patch).eq("ranch_id", ranchId).eq("id", id).select("id");
  if (error) return fail(dbErrorMessage(error));
  return data?.length ? ok(null) : fail("That post could not be found.");
};

/** Archived posts are hidden from the site and from the main list but kept. */
export const archivePost = (db: Db, ranchId: string, id: string) =>
  touch(db, ranchId, id, { archived_at: new Date().toISOString() });
export const unarchivePost = (db: Db, ranchId: string, id: string) => touch(db, ranchId, id, { archived_at: null });
/**
 * Moving to the trash hides a post everywhere; it can be restored until it is deleted for good. A post that was
 * live comes back as a draft, so restoring it can never put it on the website by surprise.
 */
export const trashPost = (db: Db, ranchId: string, id: string) =>
  touch(db, ranchId, id, { deleted_at: new Date().toISOString(), status: "draft" });
export const restorePost = (db: Db, ranchId: string, id: string) => touch(db, ranchId, id, { deleted_at: null });

export async function deletePostForever(db: Db, ranchId: string, id: string): Promise<Result> {
  const { data, error } = await db
    .from("posts")
    .delete()
    .eq("ranch_id", ranchId)
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  return data?.length ? ok(null) : fail("Only a post in the trash can be deleted for good.");
}

export async function emptyTrash(db: Db, ranchId: string): Promise<Result<{ removed: number }>> {
  const { data, error } = await db
    .from("posts")
    .delete()
    .eq("ranch_id", ranchId)
    .not("deleted_at", "is", null)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  return ok({ removed: data?.length ?? 0 });
}

export async function createDraft(
  db: Db,
  ranchId: string,
  userId: string | null,
): Promise<Result<{ id: string }>> {
  const { data, error } = await db
    .from("posts")
    .insert({ ranch_id: ranchId, title: UNTITLED, slug: "", created_by: userId, last_edited_by: userId })
    .select("id")
    .single();
  if (error) return fail(dbErrorMessage(error));
  return ok({ id: data.id });
}

/** A new draft with the same content. The copy has its own address and is never published automatically. */
export async function duplicatePost(
  db: Db,
  ranchId: string,
  userId: string | null,
  id: string,
): Promise<Result<{ id: string }>> {
  const row = await loadRow(db, ranchId, id);
  if (!row.ok) return row;
  const src = row.data.draft_data !== null ? parseSnapshot(row.data.draft_data) : await liveSnapshot(db, ranchId, row.data);
  const created = await createDraft(db, ranchId, userId);
  if (!created.ok) return created;
  const { data: fresh } = await db.from("posts").select("updated_at").eq("id", created.data.id).single();
  const copy: PostSnapshot = {
    ...src,
    title: `Copy of ${src.title || UNTITLED}`.slice(0, 160),
    slug: "",
    publishedAt: null,
    relatedIds: [],
  };
  const r = await applyToColumns(db, ranchId, userId, created.data.id, copy, "draft", fresh?.updated_at ?? "");
  if (!r.ok) {
    await db.from("posts").delete().eq("id", created.data.id).eq("ranch_id", ranchId);
    return r;
  }
  await addRevision(db, ranchId, created.data.id, userId, "duplicate", copy);
  return ok({ id: created.data.id });
}

// ─── Revisions ──────────────────────────────────────────────────────────────

export type RevisionItem = { id: string; createdAt: string; reason: string; title: string };

export async function listRevisions(db: Db, ranchId: string, postId: string): Promise<Result<RevisionItem[]>> {
  const { data, error } = await db
    .from("post_revisions")
    .select("id, created_at, reason, snapshot")
    .eq("ranch_id", ranchId)
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(KEEP_REVISIONS);
  if (error) return fail(dbErrorMessage(error));
  return ok(
    data.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      reason: r.reason,
      title: (r.snapshot as { title?: string } | null)?.title || UNTITLED,
    })),
  );
}

/** Brings an old version back as the current edit. Nothing goes live until the owner publishes or updates. */
export async function restoreRevision(
  db: Db,
  ranchId: string,
  userId: string | null,
  postId: string,
  revisionId: string,
): Promise<Result<{ snapshot: PostSnapshot; version: string; thumbs: Record<string, string | null> }>> {
  const { data, error } = await db
    .from("post_revisions")
    .select("snapshot")
    .eq("ranch_id", ranchId)
    .eq("post_id", postId)
    .eq("id", revisionId)
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!data) return fail("That version could not be found.");
  const s = parseSnapshot(data.snapshot);
  const row = await loadRow(db, ranchId, postId);
  if (!row.ok) return row;
  const p = row.data;
  if (p.status === "published") {
    const u = await db
      .from("posts")
      .update({ draft_data: s as unknown as Json, draft_saved_at: new Date().toISOString(), last_edited_by: userId })
      .eq("id", postId)
      .eq("ranch_id", ranchId);
    if (u.error) return fail(dbErrorMessage(u.error));
  } else {
    const r = await applyToColumns(db, ranchId, userId, postId, s, "draft", p.updated_at);
    if (!r.ok) return r;
  }
  await addRevision(db, ranchId, postId, userId, "restore", s);
  const [{ data: fresh }, { data: media }] = await Promise.all([
    db.from("posts").select("updated_at").eq("id", postId).eq("ranch_id", ranchId).maybeSingle(),
    (() => {
      const ids = [s.featuredMediaId, s.ogMediaId].filter((x): x is string => Boolean(x));
      return ids.length ? db.from("media").select("id, variants").in("id", ids) : Promise.resolve({ data: [] });
    })(),
  ]);
  return ok({
    snapshot: s,
    version: fresh?.updated_at ?? p.updated_at,
    thumbs: Object.fromEntries((media ?? []).map((m) => [m.id, thumbOf(m.variants)])),
  });
}

// ─── Categories, tags, suggestions ──────────────────────────────────────────

const cleanName = (name: string, max: number) => name.replace(/\s+/g, " ").trim().slice(0, max);

export async function createCategory(db: Db, ranchId: string, name: string) {
  const clean = cleanName(name, 60);
  const slug = slugify(clean);
  if (!clean || !slug) return fail("Enter a name with some letters or numbers.");
  const { data, error } = await db
    .from("post_categories")
    .insert({ ranch_id: ranchId, name: clean, slug })
    .select("id, name, slug")
    .single();
  if (error) return fail(error.code === "23505" ? "You already have a category like that." : dbErrorMessage(error));
  return ok({ ...data, count: 0 });
}

export async function renameCategory(db: Db, ranchId: string, id: string, name: string): Promise<Result> {
  const clean = cleanName(name, 60);
  const slug = slugify(clean);
  if (!clean || !slug) return fail("Enter a name with some letters or numbers.");
  const { data, error } = await db
    .from("post_categories")
    .update({ name: clean, slug })
    .eq("ranch_id", ranchId)
    .eq("id", id)
    .select("id");
  if (error) return fail(error.code === "23505" ? "You already have a category like that." : dbErrorMessage(error));
  return data?.length ? ok(null) : fail("That category could not be found.");
}

/** Posts in a deleted category simply become uncategorized. */
export async function deleteCategory(db: Db, ranchId: string, id: string): Promise<Result> {
  const { data, error } = await db.from("post_categories").delete().eq("ranch_id", ranchId).eq("id", id).select("id");
  if (error) return fail(dbErrorMessage(error));
  return data?.length ? ok(null) : fail("That category could not be found.");
}

export async function addSuggestedCategories(db: Db, ranchId: string): Promise<Result<{ added: number }>> {
  const { data: have } = await db.from("post_categories").select("slug").eq("ranch_id", ranchId);
  const slugs = new Set((have ?? []).map((c) => c.slug));
  const missing = SUGGESTED_CATEGORIES.filter((c) => !slugs.has(c.slug));
  if (!missing.length) return ok({ added: 0 });
  const { error } = await db
    .from("post_categories")
    .insert(missing.map((c, i) => ({ ranch_id: ranchId, name: c.name, slug: c.slug, sort_order: (slugs.size + i + 1) * 10 })));
  if (error) return fail(dbErrorMessage(error));
  return ok({ added: missing.length });
}

export async function createTag(db: Db, ranchId: string, name: string) {
  const clean = cleanName(name, 40);
  const slug = slugify(clean);
  if (!clean || !slug) return fail("Enter a tag with some letters or numbers.");
  const found = await db.from("post_tags").select("id, name, slug").eq("ranch_id", ranchId).eq("slug", slug).maybeSingle();
  if (found.data) return ok({ ...found.data, count: 0 });
  const { data, error } = await db
    .from("post_tags")
    .insert({ ranch_id: ranchId, name: clean, slug })
    .select("id, name, slug")
    .single();
  if (error) return fail(dbErrorMessage(error));
  return ok({ ...data, count: 0 });
}

export async function renameTag(db: Db, ranchId: string, id: string, name: string): Promise<Result> {
  const clean = cleanName(name, 40);
  const slug = slugify(clean);
  if (!clean || !slug) return fail("Enter a tag with some letters or numbers.");
  const { data, error } = await db
    .from("post_tags")
    .update({ name: clean, slug })
    .eq("ranch_id", ranchId)
    .eq("id", id)
    .select("id");
  if (error) return fail(error.code === "23505" ? "You already have a tag like that." : dbErrorMessage(error));
  return data?.length ? ok(null) : fail("That tag could not be found.");
}

export async function deleteTag(db: Db, ranchId: string, id: string): Promise<Result> {
  const { data, error } = await db.from("post_tags").delete().eq("ranch_id", ranchId).eq("id", id).select("id");
  if (error) return fail(dbErrorMessage(error));
  return data?.length ? ok(null) : fail("That tag could not be found.");
}

// ─── Pickers inside the editor ──────────────────────────────────────────────

export type LinkTarget = { kind: "post" | "animal" | "page"; label: string; href: string; id?: string };

const PAGES: LinkTarget[] = [
  { kind: "page", label: "Home", href: "/" },
  { kind: "page", label: "About", href: "/about" },
  { kind: "page", label: "Contact", href: "/contact" },
  { kind: "page", label: "What's Happening on the Ranch", href: "/on-the-ranch" },
  { kind: "page", label: "Horses", href: `/${speciesTerms.horse.path}` },
  { kind: "page", label: "Cattle", href: `/${speciesTerms.cattle.path}` },
  { kind: "page", label: "For Sale", href: "/for-sale" },
  { kind: "page", label: "Breeding Services", href: "/breeding" },
];

/** Posts, animals and pages the owner can link to by name, so they never have to type a web address. */
export async function searchLinkTargets(db: Db, ranchId: string, q: string): Promise<LinkTarget[]> {
  const term = searchTerm(q);
  const [posts, animals] = await Promise.all([
    db
      .from("posts")
      .select("id, title, slug")
      .eq("ranch_id", ranchId)
      .eq("status", "published")
      .is("deleted_at", null)
      .is("archived_at", null)
      .ilike("title", `%${term}%`)
      .limit(8),
    db.from("animals").select("id, name, slug, species").eq("ranch_id", ranchId).ilike("name", `%${term}%`).limit(8),
  ]);
  const lower = term.toLowerCase();
  return [
    ...PAGES.filter((p) => !lower || p.label.toLowerCase().includes(lower)),
    ...(posts.data ?? []).map((p) => ({
      kind: "post" as const,
      label: p.title,
      href: `/on-the-ranch/${p.slug}`,
      id: p.id,
    })),
    ...(animals.data ?? []).map((a) => ({
      kind: "animal" as const,
      label: a.name,
      href: `/${speciesTerms[a.species].path}/${a.slug}`,
      id: a.id,
    })),
  ];
}

export async function searchPostsForRelated(
  db: Db,
  ranchId: string,
  q: string,
  exceptId: string,
): Promise<{ id: string; title: string }[]> {
  const term = searchTerm(q);
  const { data } = await db
    .from("posts")
    .select("id, title")
    .eq("ranch_id", ranchId)
    .neq("id", exceptId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .ilike("title", `%${term}%`)
    .order("updated_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

export type { PostStatus, PostSnapshot, PostInput, Doc };
