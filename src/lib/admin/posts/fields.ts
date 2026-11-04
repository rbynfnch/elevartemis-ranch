/** The rules for a post as typed into the editor: tidy text, a plain web address, one date. Pure, so it is easy to test. */
export type PostInput = {
  title: string;
  slug: string;
  excerpt: string;
  body: unknown;
  featuredMediaId: string | null;
  categoryId: string | null;
  status: "draft" | "published";
  /** YYYY-MM-DD, or empty for "now" when it is published. */
  publishedOn: string;
  metaTitle: string;
  metaDescription: string;
  focusPhrase: string;
  extraMediaIds: string[];
  animalIds: string[];
};

const squash = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);

/** "Branding Day, 2026!" becomes "branding-day-2026". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

export type TidyPost = {
  title: string;
  slug: string;
  excerpt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_phrase: string | null;
  published_at: string | null;
};

export function tidyPost(input: PostInput): { ok: true; post: TidyPost } | { ok: false; message: string } {
  const title = squash(input.title, 160);
  if (!title) return { ok: false, message: "Give the post a title." };
  const slug = slugify(input.slug || title);
  if (!slug) return { ok: false, message: "The web address needs some letters or numbers." };
  if (input.publishedOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.publishedOn))
    return { ok: false, message: "Choose a valid date." };
  const year = Number(input.publishedOn.slice(0, 4));
  if (input.publishedOn && (year < 1900 || year > new Date().getFullYear() + 1))
    return { ok: false, message: "Choose a valid date." };
  return {
    ok: true,
    post: {
      title,
      slug,
      excerpt: squash(input.excerpt, 300) || null,
      meta_title: squash(input.metaTitle, 70) || null,
      meta_description: squash(input.metaDescription, 200) || null,
      focus_phrase: squash(input.focusPhrase, 80) || null,
      // Noon UTC, so the date reads the same in every time zone.
      published_at: input.publishedOn ? `${input.publishedOn}T12:00:00Z` : null,
    },
  };
}

/** Length guidance shown under the meta fields: search results cut text off beyond these. */
export const META_TITLE_BEST = 60;
export const META_DESCRIPTION_BEST = { min: 70, max: 160 } as const;

export function metaHint(kind: "title" | "description", text: string): string {
  const n = text.trim().length;
  if (kind === "title")
    return n === 0
      ? "Leave blank to use the post's title."
      : n > META_TITLE_BEST
        ? `${n} characters. Search results may cut it off after ${META_TITLE_BEST}.`
        : `${n} characters. Good.`;
  if (n === 0) return "Leave blank to use the summary.";
  if (n < META_DESCRIPTION_BEST.min)
    return `${n} characters. A little short: aim for ${META_DESCRIPTION_BEST.min} to ${META_DESCRIPTION_BEST.max}.`;
  if (n > META_DESCRIPTION_BEST.max)
    return `${n} characters. Search results may cut it off after ${META_DESCRIPTION_BEST.max}.`;
  return `${n} characters. Good.`;
}
