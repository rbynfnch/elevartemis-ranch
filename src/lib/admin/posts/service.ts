/** Reading and saving blog posts. Plain functions over the owner's Supabase client, so RLS applies. */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import { stripBrokenPhotos } from "@/lib/content/photos";
import { slugify, tidyPost, type PostInput } from "./fields";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type PostListItem = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
  categoryName: string | null;
  thumb: string | null;
};

const thumbOf = (variants: unknown) => {
  const v = pickVariant(variants as Json, 480);
  return v ? mediaUrl(v.path) : null;
};

export async function listPosts(db: Db, ranchId: string): Promise<Result<PostListItem[]>> {
  const { data, error } = await db
    .from("posts")
    .select("id, title, slug, status, published_at, updated_at, category_id, featured_media_id")
    .eq("ranch_id", ranchId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) return fail(dbErrorMessage(error));
  const [cats, media] = await Promise.all([
    db.from("post_categories").select("id, name").eq("ranch_id", ranchId),
    (async () => {
      const ids = data.map((p) => p.featured_media_id).filter((id): id is string => Boolean(id));
      return ids.length ? db.from("media").select("id, variants").in("id", ids) : { data: [] };
    })(),
  ]);
  const catName = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
  const thumbs = new Map((media.data ?? []).map((m) => [m.id, thumbOf(m.variants)]));
  return ok(
    data.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      publishedAt: p.published_at,
      updatedAt: p.updated_at,
      categoryName: p.category_id ? (catName.get(p.category_id) ?? null) : null,
      thumb: p.featured_media_id ? (thumbs.get(p.featured_media_id) ?? null) : null,
    })),
  );
}

export type PostEditorData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: unknown;
  featured: { id: string | null; thumb: string | null };
  categoryId: string | null;
  status: "draft" | "published";
  publishedOn: string;
  metaTitle: string;
  metaDescription: string;
  focusPhrase: string;
  extraPhotos: { id: string; thumb: string | null }[];
  animals: { id: string; name: string }[];
  categories: { id: string; name: string }[];
};

export async function getPostForEdit(db: Db, ranchId: string, id: string): Promise<Result<PostEditorData>> {
  const { data: p, error } = await db
    .from("posts")
    .select("id, title, slug, excerpt, body, featured_media_id, category_id, status, published_at")
    .eq("ranch_id", ranchId)
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (!p) return fail("That post could not be found.");

  const [meta, cats, extra, mentioned] = await Promise.all([
    // Later update: absent columns simply come back empty.
    db.from("posts").select("meta_title, meta_description, focus_phrase").eq("id", id).maybeSingle(),
    db.from("post_categories").select("id, name").eq("ranch_id", ranchId).order("sort_order").order("name"),
    db.from("post_media").select("media_id, sort_order").eq("post_id", id).order("sort_order"),
    db.from("post_animals").select("animal_id").eq("post_id", id),
  ]);
  const mediaIds = [p.featured_media_id, ...(extra.data ?? []).map((m) => m.media_id)].filter((x): x is string =>
    Boolean(x),
  );
  const { data: media } = mediaIds.length
    ? await db.from("media").select("id, variants").in("id", mediaIds)
    : { data: [] };
  const thumbs = new Map((media ?? []).map((m) => [m.id, thumbOf(m.variants)]));
  const animalIds = (mentioned.data ?? []).map((a) => a.animal_id);
  const { data: animals } = animalIds.length
    ? await db.from("animals").select("id, name").in("id", animalIds)
    : { data: [] };

  return ok({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? "",
    body: p.body,
    featured: {
      id: p.featured_media_id,
      thumb: p.featured_media_id ? (thumbs.get(p.featured_media_id) ?? null) : null,
    },
    categoryId: p.category_id,
    status: p.status,
    publishedOn: p.published_at ? p.published_at.slice(0, 10) : "",
    metaTitle: meta.data?.meta_title ?? "",
    metaDescription: meta.data?.meta_description ?? "",
    focusPhrase: meta.data?.focus_phrase ?? "",
    extraPhotos: (extra.data ?? []).map((m) => ({ id: m.media_id, thumb: thumbs.get(m.media_id) ?? null })),
    animals: (animals ?? []).map((a) => ({ id: a.id, name: a.name })),
    categories: (cats.data ?? []).map((c) => ({ id: c.id, name: c.name })),
  });
}

/** A new, empty draft to start writing in. */
export async function createDraft(db: Db, ranchId: string, userId: string | null): Promise<Result<{ id: string }>> {
  const { data, error } = await db
    .from("posts")
    .insert({ ranch_id: ranchId, title: "Untitled post", slug: "", created_by: userId })
    .select("id")
    .single();
  if (error) return fail(dbErrorMessage(error));
  return ok({ id: data.id });
}

export async function savePost(
  db: Db,
  ranchId: string,
  id: string,
  input: PostInput,
): Promise<Result<{ slug: string }>> {
  const tidy = tidyPost(input);
  if (!tidy.ok) return fail(tidy.message);
  const { meta_title, meta_description, focus_phrase, ...core } = tidy.post;
  const row = {
    ...core,
    // A photo spot that names no photo could never show; it is left out rather than saved.
    body: (stripBrokenPhotos(input.body ?? null) ?? null) as Json | null,
    featured_media_id: input.featuredMediaId,
    category_id: input.categoryId,
    status: input.status,
  };
  // Publishing without a date stamps "now" in the database; a draft keeps whatever date it has.
  const update = (withMeta: boolean) =>
    db
      .from("posts")
      .update({
        ...row,
        published_at: core.published_at ?? undefined,
        ...(withMeta ? { meta_title, meta_description, focus_phrase } : {}),
      })
      .eq("ranch_id", ranchId)
      .eq("id", id)
      .select("slug");
  let res = await update(true);
  if (res.error && /meta_title|meta_description|focus_phrase/.test(res.error.message)) res = await update(false);
  if (res.error) {
    // The web address must be unique among this ranch's posts.
    if (res.error.code === "23505") return fail("Another post already uses that web address. Change it a little.");
    return fail(dbErrorMessage(res.error));
  }
  if (!res.data?.length) return fail("That post could not be found. Refresh and try again.");

  // The photos and animals in the post are replaced as a set.
  const cleared = await Promise.all([
    db.from("post_media").delete().eq("post_id", id),
    db.from("post_animals").delete().eq("post_id", id),
  ]);
  for (const c of cleared) if (c.error) return fail(dbErrorMessage(c.error));
  if (input.extraMediaIds.length) {
    const r = await db
      .from("post_media")
      .insert(input.extraMediaIds.map((media_id, i) => ({ ranch_id: ranchId, post_id: id, media_id, sort_order: i })));
    if (r.error) return fail(dbErrorMessage(r.error));
  }
  if (input.animalIds.length) {
    const r = await db
      .from("post_animals")
      .insert([...new Set(input.animalIds)].map((animal_id) => ({ ranch_id: ranchId, post_id: id, animal_id })));
    if (r.error) return fail(dbErrorMessage(r.error));
  }
  return ok({ slug: res.data[0].slug });
}

export async function createCategory(
  db: Db,
  ranchId: string,
  name: string,
): Promise<Result<{ id: string; name: string }>> {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 60);
  if (!clean) return fail("Enter a name for the category.");
  const slug = slugify(clean);
  if (!slug) return fail("The category name needs some letters or numbers.");
  const { data, error } = await db
    .from("post_categories")
    .insert({ ranch_id: ranchId, name: clean, slug })
    .select("id, name")
    .single();
  if (error) return fail(error.code === "23505" ? "You already have a category like that." : dbErrorMessage(error));
  return ok(data);
}

/** Moves a post out of sight (it can be restored from the database; owners don't see archives). */
export async function archivePost(db: Db, ranchId: string, id: string): Promise<Result> {
  const { data, error } = await db
    .from("posts")
    .update({ archived_at: new Date().toISOString(), status: "draft" })
    .eq("ranch_id", ranchId)
    .eq("id", id)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  return data?.length ? ok(null) : fail("That post could not be found.");
}
