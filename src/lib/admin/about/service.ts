/** Reading and saving the About page's content. Plain functions over the owner's Supabase client, so RLS applies. */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import { docToText, textToDoc } from "@/lib/admin/form-values";
import type { Db, Result } from "@/lib/admin/animals/service";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import { aboutSchema, parseAbout, toSections, type AboutIcon } from "@/lib/site/about";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

type Item = { icon: AboutIcon | null; title: string; text: string };
type Photo = { id: string | null; thumb: string | null };

/** The About page as the editor holds it: text in plain boxes, photos with a small preview. */
export type AboutForm = {
  intro: { heading: string; body: string; photo: Photo; showMark: boolean };
  highlights: Item[];
  story: { heading: string; body: string; photo: Photo; buttonLabel: string; buttonHref: string };
  valuesHeading: string;
  values: Item[];
  band: Photo;
};

const pad = (items: Item[], n: number): Item[] =>
  Array.from({ length: n }, (_, i) => items[i] ?? { icon: null, title: "", text: "" });

export async function loadAbout(db: Db, ranchId: string): Promise<Result<AboutForm>> {
  const { data, error } = await db
    .from("pages")
    .select("sections")
    .eq("ranch_id", ranchId)
    .eq("key", "about")
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  const c = parseAbout(data?.sections);
  const ids = [c.intro.mediaId, c.story.mediaId, c.bandMediaId].filter((id): id is string => Boolean(id));
  const thumbs = new Map<string, string>();
  if (ids.length) {
    const { data: media } = await db.from("media").select("id, variants").in("id", ids);
    for (const m of media ?? []) {
      const v = pickVariant(m.variants as Json, 480);
      if (v) thumbs.set(m.id, mediaUrl(v.path));
    }
  }
  const photo = (id: string | null): Photo => ({ id, thumb: id ? (thumbs.get(id) ?? null) : null });
  return ok({
    intro: {
      heading: c.intro.heading,
      body: docToText(c.intro.body),
      photo: photo(c.intro.mediaId),
      showMark: c.intro.showMark,
    },
    highlights: pad(c.highlights, 3),
    story: {
      heading: c.story.heading,
      body: docToText(c.story.body),
      photo: photo(c.story.mediaId),
      buttonLabel: c.story.buttonLabel,
      buttonHref: c.story.buttonHref,
    },
    valuesHeading: c.valuesHeading,
    values: pad(c.values, 4),
    band: photo(c.bandMediaId),
  });
}

export type AboutSaveInput = {
  intro: { heading: string; body: string; mediaId: string | null; showMark: boolean };
  highlights: Item[];
  story: { heading: string; body: string; mediaId: string | null; buttonLabel: string; buttonHref: string };
  valuesHeading: string;
  values: Item[];
  bandMediaId: string | null;
};

export async function saveAbout(db: Db, ranchId: string, input: AboutSaveInput): Promise<Result> {
  const parsed = aboutSchema.safeParse({
    intro: { ...input.intro, body: textToDoc(input.intro.body) },
    highlights: input.highlights,
    story: { ...input.story, body: textToDoc(input.story.body) },
    valuesHeading: input.valuesHeading,
    values: input.values,
    bandMediaId: input.bandMediaId,
  });
  if (!parsed.success) return fail("Check the About page details. A title or paragraph may be too long.");
  const { data, error } = await db
    .from("pages")
    .update({ sections: toSections(parsed.data) as NonNullable<Json> })
    .eq("ranch_id", ranchId)
    .eq("key", "about")
    .select("key");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail("The About page could not be found. Refresh and try again.");
  return ok(null);
}
