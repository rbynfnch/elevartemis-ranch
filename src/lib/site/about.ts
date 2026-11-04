/**
 * The About page's content, kept in `pages.sections` (key "about") as a list of
 * sections the platform defines: intro, highlights, story, values and a photo band.
 * Every part is optional and a part with nothing in it is simply not shown.
 * Nothing here is ranch-specific wording: it all comes from the owner.
 */
import { z } from "zod";
import { richTextIsEmpty } from "@/lib/content/empty";

export const aboutIcons = ["horseshoe", "mountains", "people", "plant", "shield", "tree", "heart", "star"] as const;
export type AboutIcon = (typeof aboutIcons)[number];

export const iconLabels: Record<AboutIcon, string> = {
  horseshoe: "Horseshoe",
  mountains: "Mountains",
  people: "People",
  plant: "Seedling",
  shield: "Shield",
  tree: "Tree",
  heart: "Heart",
  star: "Star",
};

const text = (max: number) => z.string().trim().max(max).default("");
const optionalIcon = z.enum(aboutIcons).nullable().default(null);
const doc = z.unknown().nullable().default(null);
const mediaId = z.uuid().nullable().default(null);

const item = z.object({ icon: optionalIcon, title: text(60), text: text(200) });
const intro = z.object({ heading: text(120), body: doc, mediaId, showMark: z.boolean().default(false) });
const story = z.object({
  heading: text(120),
  body: doc,
  mediaId,
  buttonLabel: text(40),
  /** A path on this site ("/contact") or an https address. */
  buttonHref: text(300),
});

export const aboutSchema = z.object({
  intro: intro.default({ heading: "", body: null, mediaId: null, showMark: false }),
  highlights: z.array(item).max(3).default([]),
  story: story.default({ heading: "", body: null, mediaId: null, buttonLabel: "", buttonHref: "" }),
  valuesHeading: text(60),
  values: z.array(item).max(4).default([]),
  bandMediaId: mediaId,
});
export type AboutContent = z.infer<typeof aboutSchema>;

export const emptyAbout: AboutContent = aboutSchema.parse({});

/** A button may go to a page on this site or to an https address; anything else is dropped. */
export function safeButtonHref(raw: string): string | null {
  const h = raw.trim();
  if (/^https:\/\/[^\s]+$/i.test(h)) return h;
  if (h.startsWith("/") && !h.startsWith("//") && !/\s/.test(h)) return h;
  return null;
}

const hasText = (v: string) => v.trim().length > 0;
const itemFilled = (i: { title: string; text: string }) => hasText(i.title) || hasText(i.text);

/** Reads what is stored, tolerating anything unexpected (it just comes back empty). */
export function parseAbout(sections: unknown): AboutContent {
  const list = Array.isArray(sections) ? sections : [];
  const by = (kind: string) =>
    list.find((s) => s && typeof s === "object" && (s as { kind?: unknown }).kind === kind) as
      Record<string, unknown> | undefined;
  const raw = {
    intro: by("intro"),
    highlights: (by("highlights") as { items?: unknown } | undefined)?.items,
    story: by("story"),
    valuesHeading: (by("values") as { heading?: unknown } | undefined)?.heading,
    values: (by("values") as { items?: unknown } | undefined)?.items,
    bandMediaId: (by("photo_band") as { mediaId?: unknown } | undefined)?.mediaId,
  };
  const parsed = aboutSchema.safeParse(raw);
  return parsed.success ? parsed.data : emptyAbout;
}

/** What is saved: only parts with something in them, in the order the page shows them. */
export function toSections(c: AboutContent): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  if (hasText(c.intro.heading) || !richTextIsEmpty(c.intro.body) || c.intro.mediaId || c.intro.showMark)
    out.push({ id: "intro", kind: "intro", ...c.intro });
  const highlights = c.highlights.filter(itemFilled);
  if (highlights.length) out.push({ id: "highlights", kind: "highlights", items: highlights });
  const s = c.story;
  if (hasText(s.heading) || !richTextIsEmpty(s.body) || s.mediaId || hasText(s.buttonLabel))
    out.push({ id: "story", kind: "story", ...s });
  const values = c.values.filter(itemFilled);
  if (values.length) out.push({ id: "values", kind: "values", heading: c.valuesHeading, items: values });
  if (c.bandMediaId) out.push({ id: "band", kind: "photo_band", mediaId: c.bandMediaId });
  return out;
}

/** True when there is nothing to show. */
export const aboutIsEmpty = (c: AboutContent) => toSections(c).length === 0;

export { itemFilled };
