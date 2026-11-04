import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { cardFromRow, type ListingCard } from "@/lib/animals/cards";
import { collectMediaIds, readingMinutes } from "@/lib/blog/content";
import { collectPhotoIds } from "@/lib/content/photos";
import { photoFromMedia, type PageBanner } from "./get-banner";

export type PostCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: string;
  updatedAt?: string;
  category: { name: string; slug: string } | null;
  photo: PageBanner["photo"];
};

export type PostPage = PostCard & {
  body: unknown;
  updatedAt: string;
  authorName: string | null;
  minutes: number;
  tags: { name: string; slug: string }[];
  metaTitle: string | null;
  metaDescription: string | null;
  focusPhrase: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  photos: NonNullable<PageBanner["photo"]>[];
  /** Every photo used inside the story (photos, galleries, buttons), by id. */
  bodyPhotos: Record<string, PageBanner["photo"]>;
  animals: ListingCard[];
  related: PostCard[];
  previous: { title: string; slug: string } | null;
  next: { title: string; slug: string } | null;
};

type Db = SupabaseClient<Database>;
type PhotoMap = Map<string, PageBanner["photo"]>;

export const POSTS_PER_PAGE = 12;

async function photosFor(db: Db, ranchId: string, ids: string[]): Promise<PhotoMap> {
  const out: PhotoMap = new Map();
  const unique = [...new Set(ids)];
  if (!unique.length) return out;
  const { data } = await db
    .from("media")
    .select("id, variants, alt_text, focal_x, focal_y, status")
    .eq("ranch_id", ranchId)
    .in("id", unique);
  for (const m of data ?? []) out.set(m.id, photoFromMedia(m));
  return out;
}

type CardRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  updated_at?: string;
  category_id: string | null;
  featured_media_id: string | null;
};
const CARD_COLUMNS = "id, title, slug, excerpt, published_at, updated_at, category_id, featured_media_id";

async function toCards(db: Db, ranchId: string, rows: CardRow[]): Promise<PostCard[]> {
  if (!rows.length) return [];
  const [cats, photos] = await Promise.all([
    db.from("post_categories").select("id, name, slug").eq("ranch_id", ranchId),
    photosFor(
      db,
      ranchId,
      rows.map((p) => p.featured_media_id).filter((id): id is string => Boolean(id)),
    ),
  ]);
  const category = new Map((cats.data ?? []).map((c) => [c.id, c]));
  return rows.map((p) => {
    const c = p.category_id ? category.get(p.category_id) : null;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      publishedAt: p.published_at ?? "",
      updatedAt: p.updated_at,
      category: c ? { name: c.name, slug: c.slug } : null,
      photo: p.featured_media_id ? (photos.get(p.featured_media_id) ?? null) : null,
    };
  });
}

/** Every published post, newest first, optionally narrowed to one category or tag. (Row-level security hides drafts, scheduled and trashed posts.) */
async function loadCards(db: Db, ranchId: string, categorySlug?: string, tagSlug?: string): Promise<PostCard[]> {
  const { data, error } = await db
    .from("posts")
    .select(CARD_COLUMNS)
    .eq("ranch_id", ranchId)
    .eq("status", "published")
    .is("archived_at", null)
    .order("published_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(`Loading posts failed: ${error.message}`);
  let rows = data ?? [];
  if (tagSlug) {
    const { data: tag } = await db.from("post_tags").select("id").eq("ranch_id", ranchId).eq("slug", tagSlug).maybeSingle();
    const { data: links } = tag ? await db.from("post_tag_links").select("post_id").eq("tag_id", tag.id) : { data: [] };
    const ids = new Set((links ?? []).map((l) => l.post_id));
    rows = rows.filter((r) => ids.has(r.id));
  }
  const cards = await toCards(db, ranchId, rows);
  return categorySlug ? cards.filter((p) => p.category?.slug === categorySlug) : cards;
}

export async function getPostCategories(ranchId: string, slug: string): Promise<{ name: string; slug: string }[]> {
  "use cache";
  cacheLife("minutes");
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
  cacheLife("minutes");
  cacheTag(cacheTags.ranch(slug), cacheTags.posts(slug));
  return loadCards(createPublicClient(), ranchId, categorySlug);
}

/** One page of the list, optionally in one category or with one tag. */
export async function getPostList(
  ranchId: string,
  slug: string,
  opts: { category?: string; tag?: string; page?: number } = {},
): Promise<{ posts: PostCard[]; page: number; pages: number; total: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag(cacheTags.ranch(slug), cacheTags.posts(slug));
  const all = await loadCards(createPublicClient(), ranchId, opts.category, opts.tag);
  const pages = Math.max(1, Math.ceil(all.length / POSTS_PER_PAGE));
  const page = Math.min(Math.max(1, Math.floor(opts.page ?? 1)), pages);
  return { posts: all.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE), page, pages, total: all.length };
}

/** Tags that have at least one published story. */
export async function getPostTags(ranchId: string, slug: string): Promise<{ name: string; slug: string }[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(cacheTags.ranch(slug), cacheTags.posts(slug));
  const db = createPublicClient();
  const { data: tags, error } = await db.from("post_tags").select("id, name, slug").eq("ranch_id", ranchId).order("name");
  if (error || !tags?.length) return [];
  const { data: links } = await db.from("post_tag_links").select("tag_id, post_id").in("tag_id", tags.map((t) => t.id));
  // Row-level security only shows links to posts that are live.
  const used = new Set((links ?? []).map((l) => l.tag_id));
  return tags.filter((t) => used.has(t.id)).map((t) => ({ name: t.name, slug: t.slug }));
}

/** What the post page needs, whether it is live (public) or being previewed (the owner's own session). */
export type PostSource = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: unknown;
  publishedAt: string | null;
  updatedAt: string;
  categoryId: string | null;
  featuredMediaId: string | null;
  authorName: string | null;
  showAuthor: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  focusPhrase: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogMediaId: string | null;
  tagIds: string[];
  relatedIds: string[];
  animalIds: string[];
  extraMediaIds: string[];
};

export async function assemblePost(
  db: Db,
  ranchId: string,
  src: PostSource,
  opts: { neighbors: boolean },
): Promise<PostPage> {
  const inText = [...new Set([...collectPhotoIds(src.body), ...collectMediaIds(src.body)])];
  const mediaIds = [src.featuredMediaId, src.ogMediaId, ...src.extraMediaIds, ...inText].filter((id): id is string =>
    Boolean(id),
  );
  const [cat, tags, photos, cards, related, newer, older] = await Promise.all([
    src.categoryId
      ? db.from("post_categories").select("name, slug").eq("id", src.categoryId).maybeSingle()
      : Promise.resolve({ data: null }),
    src.tagIds.length
      ? db.from("post_tags").select("name, slug").in("id", src.tagIds)
      : Promise.resolve({ data: [] as { name: string; slug: string }[] }),
    photosFor(db, ranchId, mediaIds),
    src.animalIds.length
      ? db.from("public_animal_cards").select("*").eq("ranch_id", ranchId).in("id", src.animalIds)
      : Promise.resolve({ data: [] }),
    relatedFor(db, ranchId, src),
    opts.neighbors && src.publishedAt
      ? db
          .from("posts")
          .select("title, slug")
          .eq("ranch_id", ranchId)
          .eq("status", "published")
          .is("archived_at", null)
          .gt("published_at", src.publishedAt)
          .order("published_at")
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    opts.neighbors && src.publishedAt
      ? db
          .from("posts")
          .select("title, slug")
          .eq("ranch_id", ranchId)
          .eq("status", "published")
          .is("archived_at", null)
          .lt("published_at", src.publishedAt)
          .order("published_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  // Visible in the host's logs if a photo placed in the story can't be found (not ready, or not this ranch's).
  for (const id of inText)
    if (!photos.get(id)) console.warn(`[post ${src.slug}] story photo ${id} could not be loaded`);

  return {
    id: src.id,
    title: src.title,
    slug: src.slug,
    excerpt: src.excerpt,
    publishedAt: src.publishedAt ?? "",
    updatedAt: src.updatedAt,
    category: cat.data ? { name: cat.data.name, slug: cat.data.slug } : null,
    photo: src.featuredMediaId ? (photos.get(src.featuredMediaId) ?? null) : null,
    body: src.body,
    authorName: src.showAuthor && src.authorName ? src.authorName : null,
    minutes: readingMinutes(src.body),
    tags: (tags.data ?? []).map((t) => ({ name: t.name, slug: t.slug })),
    metaTitle: src.metaTitle,
    metaDescription: src.metaDescription,
    focusPhrase: src.focusPhrase,
    ogTitle: src.ogTitle,
    ogDescription: src.ogDescription,
    ogImage: src.ogMediaId ? (photos.get(src.ogMediaId)?.src ?? null) : null,
    photos: src.extraMediaIds.map((id) => photos.get(id)).filter((p): p is NonNullable<PageBanner["photo"]> => Boolean(p)),
    bodyPhotos: Object.fromEntries(inText.map((id) => [id, photos.get(id) ?? null])),
    animals: (cards.data ?? []).map(cardFromRow),
    related,
    previous: older.data ? { title: older.data.title, slug: older.data.slug } : null,
    next: newer.data ? { title: newer.data.title, slug: newer.data.slug } : null,
  };
}

/** The stories the owner chose to show underneath, or else a few from the same category (then the newest). */
async function relatedFor(db: Db, ranchId: string, src: PostSource): Promise<PostCard[]> {
  const live = () =>
    db
      .from("posts")
      .select(CARD_COLUMNS)
      .eq("ranch_id", ranchId)
      .eq("status", "published")
      .is("archived_at", null)
      .neq("id", src.id);
  if (src.relatedIds.length) {
    const { data } = await live().in("id", src.relatedIds);
    const order = new Map(src.relatedIds.map((id, i) => [id, i]));
    return toCards(
      db,
      ranchId,
      (data ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
    );
  }
  const { data: same } = src.categoryId
    ? await live().eq("category_id", src.categoryId).order("published_at", { ascending: false }).limit(3)
    : { data: [] };
  if (same?.length) return toCards(db, ranchId, same);
  const { data: newest } = await live().order("published_at", { ascending: false }).limit(3);
  return toCards(db, ranchId, newest ?? []);
}

/** The columns added by the blog update, read separately so the site keeps working until that update is applied. */
async function extras(db: Db, id: string) {
  const [meta, blog, tags, related] = await Promise.all([
    db.from("posts").select("meta_title, meta_description, focus_phrase").eq("id", id).maybeSingle(),
    db.from("posts").select("author_name, show_author, og_title, og_description, og_media_id, updated_at").eq("id", id).maybeSingle(),
    db.from("post_tag_links").select("tag_id").eq("post_id", id),
    db.from("post_related").select("related_post_id, sort_order").eq("post_id", id).order("sort_order"),
  ]);
  return {
    metaTitle: meta.data?.meta_title ?? null,
    metaDescription: meta.data?.meta_description ?? null,
    focusPhrase: meta.data?.focus_phrase ?? null,
    authorName: blog.data?.author_name ?? null,
    showAuthor: blog.data?.show_author ?? false,
    ogTitle: blog.data?.og_title ?? null,
    ogDescription: blog.data?.og_description ?? null,
    ogMediaId: blog.data?.og_media_id ?? null,
    updatedAt: blog.data?.updated_at ?? null,
    tagIds: (tags.data ?? []).map((t) => t.tag_id),
    relatedIds: (related.data ?? []).map((r) => r.related_post_id),
  };
}

/** One published post with its photos, the animals it mentions and its neighbours, or null. */
export async function getPost(ranchId: string, slug: string, postSlug: string): Promise<PostPage | null> {
  "use cache";
  cacheLife("minutes");
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
  const [x, media, mentioned] = await Promise.all([
    extras(db, post.id),
    db.from("post_media").select("media_id, sort_order").eq("post_id", post.id).order("sort_order"),
    db.from("post_animals").select("animal_id").eq("post_id", post.id),
  ]);
  return assemblePost(
    db,
    ranchId,
    {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      body: post.body,
      publishedAt: post.published_at,
      updatedAt: x.updatedAt ?? post.published_at ?? "",
      categoryId: post.category_id,
      featuredMediaId: post.featured_media_id,
      authorName: x.authorName,
      showAuthor: x.showAuthor,
      metaTitle: x.metaTitle,
      metaDescription: x.metaDescription,
      focusPhrase: x.focusPhrase,
      ogTitle: x.ogTitle,
      ogDescription: x.ogDescription,
      ogMediaId: x.ogMediaId,
      tagIds: x.tagIds,
      relatedIds: x.relatedIds,
      animalIds: (mentioned.data ?? []).map((a) => a.animal_id),
      extraMediaIds: (media.data ?? []).map((m) => m.media_id),
    },
    { neighbors: true },
  );
}

/** An old web address of a post that has since been renamed: the current address, or null. */
export async function getPostRedirect(ranchId: string, slug: string, oldSlug: string): Promise<string | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(cacheTags.ranch(slug), cacheTags.posts(slug));
  const db = createPublicClient();
  const { data: hit, error } = await db
    .from("post_slug_history")
    .select("post_id")
    .eq("ranch_id", ranchId)
    .eq("old_slug", oldSlug)
    .maybeSingle();
  if (error || !hit) return null;
  const { data: post } = await db
    .from("posts")
    .select("slug")
    .eq("id", hit.post_id)
    .eq("status", "published")
    .is("archived_at", null)
    .maybeSingle();
  return post && post.slug !== oldSlug ? post.slug : null;
}

/** Published posts that mention an animal, newest first (for "Stories featuring…" on its page). */
export async function getPostsForAnimal(ranchId: string, slug: string, animalId: string): Promise<PostCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(cacheTags.ranch(slug), cacheTags.posts(slug));
  const db = createPublicClient();
  const { data: links, error } = await db.from("post_animals").select("post_id").eq("animal_id", animalId).limit(50);
  // Before the blog has any posts, or on an older database, there is simply nothing to show.
  if (error || !links?.length) return [];
  const { data: posts } = await db
    .from("posts")
    .select(CARD_COLUMNS)
    .eq("ranch_id", ranchId)
    .eq("status", "published")
    .is("archived_at", null)
    .in(
      "id",
      links.map((l) => l.post_id),
    )
    .order("published_at", { ascending: false })
    .limit(6);
  return toCards(db, ranchId, posts ?? []);
}
