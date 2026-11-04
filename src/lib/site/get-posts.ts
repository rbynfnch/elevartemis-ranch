import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { cardFromRow, type ListingCard } from "@/lib/animals/cards";
import { collectPhotoIds } from "@/lib/content/photos";
import { photoFromMedia, type PageBanner } from "./get-banner";

export type PostCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string;
  category: { name: string; slug: string } | null;
  photo: PageBanner["photo"];
};

export type PostPage = PostCard & {
  body: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
  focusPhrase: string | null;
  photos: NonNullable<PageBanner["photo"]>[];
  /** The photos placed inside the story text, by id. */
  bodyPhotos: Record<string, PageBanner["photo"]>;
  animals: ListingCard[];
  previous: { title: string; slug: string } | null;
  next: { title: string; slug: string } | null;
};

type Db = ReturnType<typeof createPublicClient>;

async function photosFor(db: Db, ranchId: string, ids: string[]): Promise<Map<string, PageBanner["photo"]>> {
  const out = new Map<string, PageBanner["photo"]>();
  if (!ids.length) return out;
  const { data } = await db
    .from("media")
    .select("id, variants, alt_text, focal_x, focal_y, status")
    .eq("ranch_id", ranchId)
    .in("id", ids);
  for (const m of data ?? []) out.set(m.id, photoFromMedia(m));
  return out;
}

export async function getPostCategories(ranchId: string, slug: string): Promise<{ name: string; slug: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.posts(slug));
  const db = createPublicClient();
  const [cats, used] = await Promise.all([
    db.from("post_categories").select("id, name, slug, sort_order").eq("ranch_id", ranchId).order("sort_order"),
    db.from("posts").select("category_id").eq("ranch_id", ranchId).eq("status", "published").is("archived_at", null),
  ]);
  const inUse = new Set((used.data ?? []).map((p) => p.category_id));
  // Only categories with something to read.
  return (cats.data ?? []).filter((c) => inUse.has(c.id)).map((c) => ({ name: c.name, slug: c.slug }));
}

/** Published posts, newest first. */
export async function getPosts(ranchId: string, slug: string, categorySlug?: string): Promise<PostCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.posts(slug));
  const db = createPublicClient();
  const [posts, cats] = await Promise.all([
    db
      .from("posts")
      .select("id, title, slug, excerpt, published_at, category_id, featured_media_id")
      .eq("ranch_id", ranchId)
      .eq("status", "published")
      .is("archived_at", null)
      .order("published_at", { ascending: false })
      .limit(200),
    db.from("post_categories").select("id, name, slug").eq("ranch_id", ranchId),
  ]);
  if (posts.error) throw new Error(`Loading posts failed: ${posts.error.message}`);
  const category = new Map((cats.data ?? []).map((c) => [c.id, c]));
  const photos = await photosFor(
    db,
    ranchId,
    (posts.data ?? []).map((p) => p.featured_media_id).filter((id): id is string => Boolean(id)),
  );
  const all = (posts.data ?? []).map((p) => {
    const c = p.category_id ? category.get(p.category_id) : null;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      publishedAt: p.published_at ?? "",
      category: c ? { name: c.name, slug: c.slug } : null,
      photo: p.featured_media_id ? (photos.get(p.featured_media_id) ?? null) : null,
    };
  });
  return categorySlug ? all.filter((p) => p.category?.slug === categorySlug) : all;
}

/** One published post with its photos, the animals it mentions and its neighbours, or null. */
export async function getPost(ranchId: string, slug: string, postSlug: string): Promise<PostPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.posts(slug), cacheTags.animals(slug));
  const db = createPublicClient();
  const { data: post } = await db
    .from("posts")
    .select("id, title, slug, excerpt, body, published_at, category_id, featured_media_id")
    .eq("ranch_id", ranchId)
    .eq("slug", postSlug)
    .eq("status", "published")
    .is("archived_at", null)
    .maybeSingle();
  if (!post) return null;

  const [cat, extra, media, mentioned, newer, older] = await Promise.all([
    post.category_id
      ? db.from("post_categories").select("name, slug").eq("id", post.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // The meta columns come from a later update; before it is applied they are simply absent.
    db.from("posts").select("meta_title, meta_description, focus_phrase").eq("id", post.id).maybeSingle(),
    db.from("post_media").select("media_id, sort_order").eq("post_id", post.id).order("sort_order"),
    db.from("post_animals").select("animal_id").eq("post_id", post.id),
    db
      .from("posts")
      .select("title, slug")
      .eq("ranch_id", ranchId)
      .eq("status", "published")
      .is("archived_at", null)
      .gt("published_at", post.published_at ?? "")
      .order("published_at")
      .limit(1)
      .maybeSingle(),
    db
      .from("posts")
      .select("title, slug")
      .eq("ranch_id", ranchId)
      .eq("status", "published")
      .is("archived_at", null)
      .lt("published_at", post.published_at ?? "")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const inText = collectPhotoIds(post.body);
  const mediaIds = [post.featured_media_id, ...(media.data ?? []).map((m) => m.media_id), ...inText].filter(
    (id): id is string => Boolean(id),
  );
  const photos = await photosFor(db, ranchId, mediaIds);
  // Visible in the host's logs if a photo placed in the story can't be found (not ready, or not this ranch's).
  for (const id of inText)
    if (!photos.get(id)) console.warn(`[post ${post.slug}] story photo ${id} could not be loaded`);
  const animalIds = (mentioned.data ?? []).map((a) => a.animal_id);
  const { data: cards } = animalIds.length
    ? await db.from("public_animal_cards").select("*").eq("ranch_id", ranchId).in("id", animalIds)
    : { data: [] };

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    publishedAt: post.published_at ?? "",
    category: cat.data ? { name: cat.data.name, slug: cat.data.slug } : null,
    photo: post.featured_media_id ? (photos.get(post.featured_media_id) ?? null) : null,
    body: post.body,
    metaTitle: extra.data?.meta_title ?? null,
    metaDescription: extra.data?.meta_description ?? null,
    focusPhrase: extra.data?.focus_phrase ?? null,
    photos: (media.data ?? [])
      .map((m) => photos.get(m.media_id))
      .filter((p): p is NonNullable<PageBanner["photo"]> => Boolean(p)),
    bodyPhotos: Object.fromEntries(inText.map((id) => [id, photos.get(id) ?? null])),
    animals: (cards ?? []).map(cardFromRow),
    previous: older.data ? { title: older.data.title, slug: older.data.slug } : null,
    next: newer.data ? { title: newer.data.title, slug: newer.data.slug } : null,
  };
}

/** Published posts that mention an animal, newest first (for "Stories featuring…" on its page). */
export async function getPostsForAnimal(ranchId: string, slug: string, animalId: string): Promise<PostCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.posts(slug));
  const db = createPublicClient();
  const { data: links, error } = await db.from("post_animals").select("post_id").eq("animal_id", animalId).limit(50);
  // Before the blog has any posts, or on an older database, there is simply nothing to show.
  if (error || !links?.length) return [];
  const { data: posts } = await db
    .from("posts")
    .select("id, title, slug, excerpt, published_at, category_id, featured_media_id")
    .eq("ranch_id", ranchId)
    .eq("status", "published")
    .is("archived_at", null)
    .in(
      "id",
      links.map((l) => l.post_id),
    )
    .order("published_at", { ascending: false })
    .limit(6);
  if (!posts?.length) return [];
  const [cats, photos] = await Promise.all([
    db.from("post_categories").select("id, name, slug").eq("ranch_id", ranchId),
    photosFor(
      db,
      ranchId,
      posts.map((p) => p.featured_media_id).filter((id): id is string => Boolean(id)),
    ),
  ]);
  const category = new Map((cats.data ?? []).map((c) => [c.id, c]));
  return posts.map((p) => {
    const c = p.category_id ? category.get(p.category_id) : null;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      publishedAt: p.published_at ?? "",
      category: c ? { name: c.name, slug: c.slug } : null,
      photo: p.featured_media_id ? (photos.get(p.featured_media_id) ?? null) : null,
    };
  });
}
