"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { saveAboutAction } from "@/lib/admin/about/actions";
import type { AboutForm } from "@/lib/admin/about/service";
import { aboutIcons, iconLabels, type AboutIcon } from "@/lib/site/about";
import { Checkbox, Field, FormMessage, TextArea, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { PhotoPick } from "@/components/admin/banners/photo-pick";

type Item = AboutForm["highlights"][number];

const targets = [
  ["", "No button"],
  ["/contact", "Contact"],
  ["/horses", "Horses"],
  ["/cattle", "Cattle"],
  ["/for-sale", "For Sale"],
  ["/", "Home"],
] as const;

function Section({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-rule pt-8">
      <h2 className="font-display text-2xl">{title}</h2>
      {help ? <p className="max-w-[62ch] text-ink-muted">{help}</p> : null}
      {children}
    </section>
  );
}

function Items({ idPrefix, items, onChange }: { idPrefix: string; items: Item[]; onChange: (items: Item[]) => void }) {
  const set = (i: number, patch: Partial<Item>) => onChange(items.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, i) => (
        <div key={i} className="space-y-3 border border-rule bg-white p-4">
          <Field id={`${idPrefix}-icon-${i}`} label="Icon">
            <select
              id={`${idPrefix}-icon-${i}`}
              value={item.icon ?? ""}
              onChange={(e) => set(i, { icon: (e.target.value || null) as AboutIcon | null })}
              className="min-h-12 w-full border border-rule bg-white px-3 text-base"
            >
              <option value="">None</option>
              {aboutIcons.map((k) => (
                <option key={k} value={k}>
                  {iconLabels[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${idPrefix}-title-${i}`} label="Title">
            <TextInput
              id={`${idPrefix}-title-${i}`}
              value={item.title}
              maxLength={60}
              onChange={(e) => set(i, { title: e.target.value })}
            />
          </Field>
          <Field id={`${idPrefix}-text-${i}`} label="A line of text">
            <TextArea
              id={`${idPrefix}-text-${i}`}
              rows={3}
              value={item.text}
              maxLength={200}
              onChange={(e) => set(i, { text: e.target.value })}
            />
          </Field>
        </div>
      ))}
    </div>
  );
}

/** The About page's content: introduction, highlights, story, values and a photo across the bottom. */
export function AboutEditor({ initial }: { initial: AboutForm }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const known = targets.some(([v]) => v === f.story.buttonHref);
  const [custom, setCustom] = useState(!known && f.story.buttonHref !== "");

  async function save() {
    setBusy(true);
    setMessage(null);
    const r = await saveAboutAction({
      intro: { heading: f.intro.heading, body: f.intro.body, mediaId: f.intro.photo.id, showMark: f.intro.showMark },
      highlights: f.highlights,
      story: { ...f.story, mediaId: f.story.photo.id },
      valuesHeading: f.valuesHeading,
      values: f.values,
      bandMediaId: f.band.id,
    });
    setBusy(false);
    setMessage(
      r.ok ? { tone: "success", text: "Saved. Your About page is updated." } : { tone: "error", text: r.message },
    );
  }

  return (
    <div className="space-y-10">
      <p className="max-w-[62ch] text-ink-muted">
        Fill in only what you want to say. Anything you leave empty isn&apos;t shown. The big photo at the top comes
        from{" "}
        <Link href="/admin/page-banners" className="text-primary underline decoration-accent underline-offset-4">
          Page Banners
        </Link>
        .
      </p>

      <Section title="Introduction" help="A short welcome beside a photo.">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <Field id="intro-heading" label="Heading">
              <TextInput
                id="intro-heading"
                value={f.intro.heading}
                maxLength={120}
                onChange={(e) => setF({ ...f, intro: { ...f.intro, heading: e.target.value } })}
              />
            </Field>
            <Field id="intro-body" label="Text" hint="A blank line starts a new paragraph.">
              <TextArea
                id="intro-body"
                rows={6}
                value={f.intro.body}
                onChange={(e) => setF({ ...f, intro: { ...f.intro, body: e.target.value } })}
                hasHint
              />
            </Field>
            <Checkbox
              name="showMark"
              label="Show the ranch's brand mark beside it"
              checked={f.intro.showMark}
              onChange={(e) => setF({ ...f, intro: { ...f.intro, showMark: e.target.checked } })}
            />
          </div>
          <PhotoPick
            label="Photo"
            photo={f.intro.photo}
            onChange={(photo) => setF({ ...f, intro: { ...f.intro, photo } })}
          />
        </div>
      </Section>

      <Section title="Three highlights" help="Short points that sum up the ranch, shown in a row.">
        <Items idPrefix="hl" items={f.highlights} onChange={(highlights) => setF({ ...f, highlights })} />
      </Section>

      <Section title="Our story">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <Field id="story-heading" label="Heading">
              <TextInput
                id="story-heading"
                value={f.story.heading}
                maxLength={120}
                onChange={(e) => setF({ ...f, story: { ...f.story, heading: e.target.value } })}
              />
            </Field>
            <Field id="story-body" label="Text" hint="A blank line starts a new paragraph.">
              <TextArea
                id="story-body"
                rows={8}
                value={f.story.body}
                onChange={(e) => setF({ ...f, story: { ...f.story, body: e.target.value } })}
                hasHint
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="story-button" label="Button text" hint="Leave empty for no button.">
                <TextInput
                  id="story-button"
                  value={f.story.buttonLabel}
                  maxLength={40}
                  onChange={(e) => setF({ ...f, story: { ...f.story, buttonLabel: e.target.value } })}
                  hasHint
                />
              </Field>
              <Field id="story-target" label="The button goes to">
                <select
                  id="story-target"
                  value={custom ? "custom" : f.story.buttonHref}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustom(v === "custom");
                    setF({ ...f, story: { ...f.story, buttonHref: v === "custom" ? "" : v } });
                  }}
                  className="min-h-12 w-full border border-rule bg-white px-3 text-base"
                >
                  {targets.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                  <option value="custom">Another address…</option>
                </select>
              </Field>
            </div>
            {custom ? (
              <Field id="story-custom" label="Address" hint="Starting with https://, for example your Facebook page.">
                <TextInput
                  id="story-custom"
                  value={f.story.buttonHref}
                  maxLength={300}
                  onChange={(e) => setF({ ...f, story: { ...f.story, buttonHref: e.target.value } })}
                  hasHint
                />
              </Field>
            ) : null}
          </div>
          <PhotoPick
            label="Photo"
            photo={f.story.photo}
            onChange={(photo) => setF({ ...f, story: { ...f.story, photo } })}
          />
        </div>
      </Section>

      <Section title="Our values" help="Up to four, shown in a row under a heading.">
        <Field id="values-heading" label="Heading">
          <TextInput
            id="values-heading"
            value={f.valuesHeading}
            maxLength={60}
            className="max-w-sm"
            onChange={(e) => setF({ ...f, valuesHeading: e.target.value })}
          />
        </Field>
        <Items idPrefix="val" items={f.values} onChange={(values) => setF({ ...f, values })} />
      </Section>

      <Section title="Photo across the bottom" help="A wide landscape photo to finish the page.">
        <PhotoPick label="Photo" photo={f.band} onChange={(band) => setF({ ...f, band })} />
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
