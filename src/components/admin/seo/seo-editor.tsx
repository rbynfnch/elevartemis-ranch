"use client";

import { useState } from "react";
import { saveSeoAction } from "@/lib/admin/seo/actions";
import type { SeoRow } from "@/lib/admin/seo/service";
import { metaHint } from "@/lib/admin/posts/fields";
import { Field, FormMessage, TextArea, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { PhotoPick } from "@/components/admin/banners/photo-pick";

/** One page's title, description, focus phrase and share picture for search engines. */
export function SeoEditor({ pageKey, label, initial }: { pageKey: string; label: string; initial?: SeoRow }) {
  const id = pageKey.replace(/[^a-z0-9]/gi, "-");
  const [title, setTitle] = useState(initial?.metaTitle ?? "");
  const [desc, setDesc] = useState(initial?.metaDescription ?? "");
  const [focus, setFocus] = useState(initial?.focusPhrase ?? "");
  const [photo, setPhoto] = useState({ id: initial?.ogMediaId ?? null, thumb: initial?.ogThumb ?? null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    const r = await saveSeoAction(pageKey, {
      metaTitle: title,
      metaDescription: desc,
      focusPhrase: focus,
      ogMediaId: photo.id,
    });
    setBusy(false);
    setMessage(r.ok ? { tone: "success", text: "Saved." } : { tone: "error", text: r.message });
  }

  const f = focus.trim().toLowerCase();
  const checks = f
    ? ([
        ["In the search title", title.toLowerCase().includes(f)],
        ["In the search description", desc.toLowerCase().includes(f)],
      ] as const)
    : [];

  return (
    <details className="border border-rule bg-white">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
        <span className="font-display text-xl">{label}</span>
        <span className="text-sm text-ink-muted">{title || desc ? "Written" : "Using defaults"}</span>
      </summary>
      <div className="grid gap-6 border-t border-rule p-5 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <Field id={`${id}-title`} label="Search title" hint={metaHint("title", title)}>
            <TextInput
              id={`${id}-title`}
              value={title}
              maxLength={70}
              onChange={(e) => setTitle(e.target.value)}
              hasHint
            />
          </Field>
          <Field id={`${id}-desc`} label="Search description" hint={metaHint("description", desc)}>
            <TextArea
              id={`${id}-desc`}
              rows={3}
              value={desc}
              maxLength={200}
              onChange={(e) => setDesc(e.target.value)}
              hasHint
            />
          </Field>
          <Field
            id={`${id}-focus`}
            label="Focus phrase"
            hint="What someone would search for to find this page, like “registered Hereford bulls in Wyoming”. A writing guide; visitors don't see it."
          >
            <TextInput
              id={`${id}-focus`}
              value={focus}
              maxLength={80}
              onChange={(e) => setFocus(e.target.value)}
              hasHint
            />
          </Field>
          {checks.length > 0 ? (
            <ul className="space-y-1 text-sm" aria-label="Focus phrase check">
              {checks.map(([name, yes]) => (
                <li key={name} className={yes ? "text-primary" : "text-ink-muted"}>
                  {yes ? "✓" : "○"} {name}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={buttonClasses("primary", "py-2")} onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
          </div>
        </div>
        <PhotoPick label="Picture when shared" photo={photo} onChange={setPhoto} />
      </div>
    </details>
  );
}
