"use server";

import { currentRanchSlug } from "@/lib/auth/current-ranch";
import { createPublicClient } from "@/lib/supabase/public";
import { createServiceSupabase } from "@/lib/supabase/service";
import { resolveRanchBySlug } from "@/lib/site/get-site-id";
import { RATE, emailBody, emailSubject, inquirySchema, looksAutomated } from "./inquiry";
import { sendInquiryEmail } from "./send-email";

export type InquiryState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const unavailable: InquiryState = {
  ok: false,
  message: "Sorry, we couldn't send your message just now. Please try again in a few minutes.",
};

/** A visitor's message from the Contact page: checked, saved for the ranch, and emailed when email is set up. */
export async function submitInquiryAction(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const parsed = inquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors };
  }
  const input = parsed.data;
  // A script gets the same "thank you" as a person, and nothing is saved.
  if (looksAutomated(input)) return { ok: true, message: "Thank you. Your message has been sent." };

  const slug = await currentRanchSlug();
  const ranch = slug ? await resolveRanchBySlug(slug) : null;
  if (!ranch) return unavailable;

  try {
    const db = createServiceSupabase();

    // Not more than a few messages from one address, or a flood to one ranch, in a short while.
    const since = new Date(Date.now() - RATE.windowMinutes * 60_000).toISOString();
    const [fromEmail, toRanch] = await Promise.all([
      db
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("ranch_id", ranch.id)
        .eq("email", input.email)
        .gte("created_at", since),
      db
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("ranch_id", ranch.id)
        .gte("created_at", since),
    ]);
    if ((fromEmail.count ?? 0) >= RATE.perEmail || (toRanch.count ?? 0) >= RATE.perRanch)
      return {
        ok: false,
        message: "We've received a few messages from you already. Please wait a few minutes before sending another.",
      };

    // An Inquire button names an animal by its page address; only a public animal of this ranch counts.
    let animal: { id: string; name: string } | null = null;
    if (input.animal) {
      const { data } = await createPublicClient()
        .from("public_animal_cards")
        .select("id, name")
        .eq("ranch_id", ranch.id)
        .eq("slug", input.animal)
        .limit(1)
        .maybeSingle();
      if (data?.id && data.name) animal = { id: data.id, name: data.name };
    }

    const topic = input.topic || animal?.name || "";
    const { data: saved, error } = await db
      .from("inquiries")
      .insert({
        ranch_id: ranch.id,
        name: input.name,
        email: input.email,
        topic: topic || null,
        animal_id: animal?.id ?? null,
        animal_name: animal?.name ?? null,
        message: input.message,
      })
      .select("id")
      .single();
    if (error || !saved) return unavailable;

    // The email is a courtesy: the message is already saved under Messages whatever happens here.
    const { data: priv } = await db
      .from("ranch_private")
      .select("inquiry_email, inquiry_cc")
      .eq("ranch_id", ranch.id)
      .maybeSingle();
    if (priv?.inquiry_email) {
      const sent = await sendInquiryEmail({
        to: priv.inquiry_email,
        cc: priv.inquiry_cc ?? [],
        replyTo: input.email,
        subject: emailSubject({ name: input.name, topic }),
        text: emailBody({
          name: input.name,
          email: input.email,
          topic,
          animalName: animal?.name,
          message: input.message,
        }),
      });
      if (sent) await db.from("inquiries").update({ emailed_at: new Date().toISOString() }).eq("id", saved.id);
    }
  } catch {
    return unavailable;
  }
  return { ok: true, message: "Thank you. Your message has been sent, and we'll get back to you." };
}
