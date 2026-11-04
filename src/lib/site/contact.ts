/**
 * The Contact page's content, kept in `pages.sections` (key "contact"): the form's heading and hint, a heading
 * and paragraph beside a photo, and an email address to show if the owner chooses to publish one. All of it is
 * the owner's wording; anything left empty falls back to plain defaults or isn't shown.
 */
import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).default("");

export const contactSchema = z.object({
  formHeading: text(60),
  formHint: text(160),
  heading: text(80),
  text: text(400),
  mediaId: z.uuid().nullable().default(null),
  /** Shown on the page only because the owner typed it here. */
  publicEmail: text(200).refine(
    (v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    "Enter a valid email address.",
  ),
});
export type ContactContent = z.infer<typeof contactSchema>;

export const emptyContact: ContactContent = contactSchema.parse({});

export const DEFAULT_FORM_HEADING = "Get in Touch";
export const DEFAULT_FORM_HINT = "Have a question? Send us a message and we'll get back to you.";

export function parseContact(sections: unknown): ContactContent {
  const list = Array.isArray(sections) ? sections : [];
  const raw = list.find((s) => s && typeof s === "object" && (s as { kind?: unknown }).kind === "contact");
  const parsed = contactSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : emptyContact;
}

/** What is saved: nothing at all when the owner has filled in nothing. */
export function toContactSections(c: ContactContent): Record<string, unknown>[] {
  const filled = Object.values({ ...c, mediaId: c.mediaId ?? "" }).some((v) => String(v).trim() !== "");
  return filled ? [{ id: "contact", kind: "contact", ...c }] : [];
}
