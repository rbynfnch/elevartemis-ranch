/**
 * What the blog editor saves. A snapshot is the whole post as the owner left it, in plain data: it is what the editor
 * sends, what a revision stores, and what waits as a "working copy" for a post that is already live. Pure.
 */
import { CONTENT_VERSION, isId, sanitizeDoc, type Doc } from "@/lib/blog/content";
import { slugify } from "@/lib/admin/posts/fields";
import { zonedLocalToUtc } from "@/lib/blog/schedule";

export type PostSnapshot = {
  title: string;
  slug: string;
  excerpt: string;
  body: Doc | null;
  featuredMediaId: string | null;
  categoryId: string | null;
  tagIds: string[];
  authorName: string;
  showAuthor: boolean;
  /** The exact moment (ISO) the post is dated, or null to use "now" when it is published. */
  publishedAt: string | null;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogMediaId: string | null;
  relatedIds: string[];
  animalIds: string[];
  version: number;
};

/** What the editor sends: the date is a local "YYYY-MM-DDTHH:mm" in the ranch's time zone, or empty. */
export type PostInput = Omit<PostSnapshot, "publishedAt" | "body" | "version"> & {
  body: unknown;
  publishedLocal: string;
};

export const emptySnapshot = (): PostSnapshot => ({
  title: "",
  slug: "",
  excerpt: "",
  body: null,
  featuredMediaId: null,
  categoryId: null,
  tagIds: [],
  authorName: "",
  showAuthor: false,
  publishedAt: null,
  metaTitle: "",
  metaDescription: "",
  ogTitle: "",
  ogDescription: "",
  ogMediaId: null,
  relatedIds: [],
  animalIds: [],
  version: CONTENT_VERSION,
});

const squash = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);
const ids = (v: string[], max: number) => [...new Set(v.filter(isId))].slice(0, max);

/**
 * Tidies what the editor sent. A draft may be half finished (no title yet is fine); `forPublish` adds the
 * requirements for showing it to the world.
 */
export function snapshotFromInput(
  input: PostInput,
  tz: string,
  opts: { forPublish?: boolean } = {},
): { ok: true; snapshot: PostSnapshot; dropped: number } | { ok: false; message: string } {
  const title = squash(input.title, 160);
  const slug = slugify(input.slug || title)
    .slice(0, 90)
    .replace(/-+$/g, "");
  if (opts.forPublish && !title) return { ok: false, message: "Give the post a title before publishing." };
  if (opts.forPublish && !slug) return { ok: false, message: "The web address needs some letters or numbers." };
  if (slug && ["preview", "category", "page"].includes(slug))
    return { ok: false, message: "That web address is reserved. Choose another." };

  let publishedAt: string | null = null;
  if (input.publishedLocal.trim()) {
    publishedAt = zonedLocalToUtc(input.publishedLocal.trim(), tz);
    if (!publishedAt) return { ok: false, message: "That date and time isn't valid. Choose another." };
    const year = Number(publishedAt.slice(0, 4));
    if (year < 1900 || year > new Date().getFullYear() + 5)
      return { ok: false, message: "Choose a date between 1900 and a few years from now." };
  }

  const { doc, dropped } = sanitizeDoc(input.body);
  if (opts.forPublish && !doc) return { ok: false, message: "Write something in the story before publishing." };

  return {
    ok: true,
    dropped,
    snapshot: {
      title,
      slug,
      excerpt: squash(input.excerpt, 300),
      body: doc,
      featuredMediaId: isId(input.featuredMediaId) ? input.featuredMediaId : null,
      categoryId: isId(input.categoryId) ? input.categoryId : null,
      tagIds: ids(input.tagIds, 20),
      authorName: squash(input.authorName, 80),
      showAuthor: Boolean(input.showAuthor),
      publishedAt,
      metaTitle: squash(input.metaTitle, 70),
      metaDescription: squash(input.metaDescription, 200),
      ogTitle: squash(input.ogTitle, 100),
      ogDescription: squash(input.ogDescription, 300),
      ogMediaId: isId(input.ogMediaId) ? input.ogMediaId : null,
      relatedIds: ids(input.relatedIds, 6),
      animalIds: ids(input.animalIds, 30),
      version: CONTENT_VERSION,
    },
  };
}

/** True when two snapshots say the same thing (used to treat a repeated save as already done). */
export const sameSnapshot = (a: PostSnapshot, b: PostSnapshot) => JSON.stringify(a) === JSON.stringify(b);

/** Reads a stored snapshot (a revision or working copy) back, tolerating anything unexpected. */
export function parseSnapshot(raw: unknown): PostSnapshot {
  const base = emptySnapshot();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const arr = (v: unknown, max: number) =>
    Array.isArray(v)
      ? ids(
          v.filter((x): x is string => typeof x === "string"),
          max,
        )
      : [];
  return {
    ...base,
    title: str(o.title, 160),
    slug: str(o.slug, 90),
    excerpt: str(o.excerpt, 300),
    body: sanitizeDoc(o.body).doc,
    featuredMediaId: isId(o.featuredMediaId) ? o.featuredMediaId : null,
    categoryId: isId(o.categoryId) ? o.categoryId : null,
    tagIds: arr(o.tagIds, 20),
    authorName: str(o.authorName, 80),
    showAuthor: o.showAuthor === true,
    publishedAt: typeof o.publishedAt === "string" && !Number.isNaN(Date.parse(o.publishedAt)) ? o.publishedAt : null,
    metaTitle: str(o.metaTitle, 70),
    metaDescription: str(o.metaDescription, 200),
    ogTitle: str(o.ogTitle, 100),
    ogDescription: str(o.ogDescription, 300),
    ogMediaId: isId(o.ogMediaId) ? o.ogMediaId : null,
    relatedIds: arr(o.relatedIds, 6),
    animalIds: arr(o.animalIds, 30),
  };
}
