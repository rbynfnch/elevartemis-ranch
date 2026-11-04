/** Reading and saving the Contact page's content and where new messages are emailed. Plain functions over the owner's client. */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";
import { mediaUrl, pickVariant } from "@/lib/media/variants";
import { contactSchema, parseContact, toContactSections } from "@/lib/site/contact";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type ContactForm = {
  formHeading: string;
  formHint: string;
  heading: string;
  text: string;
  photo: { id: string | null; thumb: string | null };
  publicEmail: string;
  inquiryEmail: string;
  inquiryCc: string;
};

export async function loadContact(db: Db, ranchId: string): Promise<Result<ContactForm>> {
  const [page, priv] = await Promise.all([
    db.from("pages").select("sections").eq("ranch_id", ranchId).eq("key", "contact").maybeSingle(),
    db.from("ranch_private").select("inquiry_email, inquiry_cc").eq("ranch_id", ranchId).maybeSingle(),
  ]);
  if (page.error) return fail(dbErrorMessage(page.error));
  const c = parseContact(page.data?.sections);
  let thumb: string | null = null;
  if (c.mediaId) {
    const { data } = await db.from("media").select("variants").eq("id", c.mediaId).maybeSingle();
    const v = data ? pickVariant(data.variants as Json, 480) : null;
    thumb = v ? mediaUrl(v.path) : null;
  }
  return ok({
    formHeading: c.formHeading,
    formHint: c.formHint,
    heading: c.heading,
    text: c.text,
    photo: { id: c.mediaId, thumb },
    publicEmail: c.publicEmail,
    inquiryEmail: priv.data?.inquiry_email ?? "",
    inquiryCc: (priv.data?.inquiry_cc ?? []).join(", "),
  });
}

export type ContactSaveInput = {
  formHeading: string;
  formHint: string;
  heading: string;
  text: string;
  mediaId: string | null;
  publicEmail: string;
  inquiryEmail: string;
  inquiryCc: string;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function saveContact(db: Db, ranchId: string, input: ContactSaveInput): Promise<Result> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the Contact page details.");
  const inquiryEmail = input.inquiryEmail.trim();
  const cc = input.inquiryCc
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  if (inquiryEmail && !EMAIL.test(inquiryEmail)) return fail("Enter a valid email address for new messages.");
  if (cc.length > 3) return fail("Use up to three extra addresses.");
  if (cc.some((e) => !EMAIL.test(e))) return fail("One of the extra email addresses isn't valid.");

  const page = await db
    .from("pages")
    .update({ sections: toContactSections(parsed.data) as NonNullable<Json> })
    .eq("ranch_id", ranchId)
    .eq("key", "contact")
    .select("key");
  if (page.error) return fail(dbErrorMessage(page.error));
  if (!page.data?.length) return fail("The Contact page could not be found. Refresh and try again.");

  const priv = await db
    .from("ranch_private")
    .update({ inquiry_email: inquiryEmail || null, inquiry_cc: cc })
    .eq("ranch_id", ranchId)
    .select("ranch_id");
  if (priv.error) return fail(dbErrorMessage(priv.error));
  if (!priv.data?.length) return fail("The page was saved, but only an owner can change where messages are emailed.");
  return ok(null);
}
