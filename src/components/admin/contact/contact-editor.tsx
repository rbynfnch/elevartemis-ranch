"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { saveContactAction } from "@/lib/admin/contact/actions";
import type { ContactForm } from "@/lib/admin/contact/service";
import { DEFAULT_FORM_HEADING, DEFAULT_FORM_HINT } from "@/lib/site/contact";
import { Field, FormMessage, TextArea, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { PhotoPick } from "@/components/admin/banners/photo-pick";

function Section({ title, help, children }: { title: string; help?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-rule pt-8">
      <h2 className="font-display text-2xl">{title}</h2>
      {help ? <p className="max-w-[62ch] text-ink-muted">{help}</p> : null}
      {children}
    </section>
  );
}

/** The Contact page's wording and photo, and where new messages are emailed. */
export function ContactEditor({ initial }: { initial: ContactForm }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const set = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => setF((x) => ({ ...x, [key]: value }));

  async function save() {
    setBusy(true);
    setMessage(null);
    const r = await saveContactAction({
      formHeading: f.formHeading,
      formHint: f.formHint,
      heading: f.heading,
      text: f.text,
      mediaId: f.photo.id,
      publicEmail: f.publicEmail,
      inquiryEmail: f.inquiryEmail,
      inquiryCc: f.inquiryCc,
    });
    setBusy(false);
    setMessage(
      r.ok ? { tone: "success", text: "Saved. Your Contact page is updated." } : { tone: "error", text: r.message },
    );
  }

  return (
    <div className="space-y-10">
      <p className="max-w-[62ch] text-ink-muted">
        The big headline, subheadline and the landscape photo across the bottom come from{" "}
        <Link href="/admin/page-banners" className="text-primary underline decoration-accent underline-offset-4">
          Page Banners
        </Link>
        . Messages people send appear under{" "}
        <Link href="/admin/messages" className="text-primary underline decoration-accent underline-offset-4">
          Messages
        </Link>
        .
      </p>

      <Section title="The form">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="form-heading" label="Heading" hint={`Leave blank for “${DEFAULT_FORM_HEADING}”.`}>
            <TextInput
              id="form-heading"
              value={f.formHeading}
              maxLength={60}
              onChange={(e) => set("formHeading", e.target.value)}
              hasHint
            />
          </Field>
          <Field id="form-hint" label="A line under it" hint="Leave blank for a standard line.">
            <TextInput
              id="form-hint"
              value={f.formHint}
              maxLength={160}
              placeholder={DEFAULT_FORM_HINT}
              onChange={(e) => set("formHint", e.target.value)}
              hasHint
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Beside the form"
        help="A photo with a heading, a few words and your contact details. Anything left empty isn't shown."
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <Field id="side-heading" label="Heading">
              <TextInput
                id="side-heading"
                value={f.heading}
                maxLength={80}
                onChange={(e) => set("heading", e.target.value)}
              />
            </Field>
            <Field id="side-text" label="A few words">
              <TextArea
                id="side-text"
                rows={3}
                value={f.text}
                maxLength={400}
                onChange={(e) => set("text", e.target.value)}
              />
            </Field>
            <Field
              id="public-email"
              label="Email address to show on the page"
              hint="Optional. Visitors will see this address, so leave it blank if you'd rather they use the form."
            >
              <TextInput
                id="public-email"
                type="email"
                value={f.publicEmail}
                maxLength={200}
                onChange={(e) => set("publicEmail", e.target.value)}
                hasHint
              />
            </Field>
            <p className="text-sm text-ink-muted">
              Your phone number appears here when it&apos;s set in your ranch details.
            </p>
          </div>
          <PhotoPick label="Photo" photo={f.photo} onChange={(photo) => set("photo", photo)} />
        </div>
      </Section>

      <Section
        title="Where new messages are emailed"
        help="Every message is saved under Messages. When email sending is switched on for your site, a copy is also emailed to the address below, and you can reply straight from your inbox."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="inquiry-email" label="Send new messages to">
            <TextInput
              id="inquiry-email"
              type="email"
              value={f.inquiryEmail}
              maxLength={200}
              onChange={(e) => set("inquiryEmail", e.target.value)}
            />
          </Field>
          <Field id="inquiry-cc" label="Also send to (optional)" hint="Up to three addresses, separated by commas.">
            <TextInput id="inquiry-cc" value={f.inquiryCc} onChange={(e) => set("inquiryCc", e.target.value)} hasHint />
          </Field>
        </div>
      </Section>

      <div className="sticky bottom-0 z-20 -mx-[var(--gutter)] border-t border-rule bg-paper/95 px-[var(--gutter)] py-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className={buttonClasses("primary", "min-w-40")} onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
        </div>
      </div>
    </div>
  );
}
