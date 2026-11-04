"use client";

import { useState } from "react";
import clsx from "clsx";
import { saveBrandAction } from "@/lib/admin/brand/actions";
import type { BrandForm } from "@/lib/admin/brand/service";
import { fullPalette, palettePresets } from "@/lib/brand/presets";
import { fontPresets, type FontPreset } from "@/lib/brand/tokens";
import { Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

/** The site's name as shown, a short mark, one of the ready-made looks and one of the font pairs. */
export function BrandEditor({ initial, isOwner }: { initial: BrandForm; isOwner: boolean }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const customLook = f.presetId === null;

  async function save() {
    if (!f.presetId) return setMessage({ tone: "error", text: "Choose one of the looks to save." });
    setBusy(true);
    setMessage(null);
    const r = await saveBrandAction({
      wordmark: f.wordmark,
      subtitle: f.subtitle,
      mark: f.mark,
      presetId: f.presetId,
      font: f.font,
    });
    setBusy(false);
    setMessage(
      r.ok ? { tone: "success", text: "Saved. Your site has its new look." } : { tone: "error", text: r.message },
    );
  }

  return (
    <div className="space-y-10">
      {!isOwner ? (
        <FormMessage tone="info">Only the ranch&apos;s owner can change the look of the site.</FormMessage>
      ) : null}
      {customLook ? (
        <FormMessage tone="info">
          Your site has a custom look set up for you. Choose one below only if you want to switch to a ready-made one.
        </FormMessage>
      ) : null}

      <section className="space-y-4" aria-labelledby="names">
        <h2 id="names" className="font-display text-2xl">
          Your name and mark
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="br-wordmark" label="Name in the header" hint="Usually your ranch's name.">
            <TextInput
              id="br-wordmark"
              maxLength={60}
              value={f.wordmark}
              onChange={(e) => setF({ ...f, wordmark: e.target.value })}
              disabled={!isOwner}
              hasHint
            />
          </Field>
          <Field id="br-subtitle" label="A line under it (optional)" hint="Like “Ranch”.">
            <TextInput
              id="br-subtitle"
              maxLength={60}
              value={f.subtitle}
              onChange={(e) => setF({ ...f, subtitle: e.target.value })}
              disabled={!isOwner}
              hasHint
            />
          </Field>
          <Field id="br-mark" label="Short mark (optional)" hint="Two to four letters, like FW.">
            <TextInput
              id="br-mark"
              maxLength={4}
              value={f.mark}
              onChange={(e) => setF({ ...f, mark: e.target.value })}
              disabled={!isOwner}
              hasHint
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t border-rule pt-8" aria-labelledby="looks">
        <h2 id="looks" className="font-display text-2xl">
          Colors
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {palettePresets.map((p) => {
            const c = fullPalette(p);
            const chosen = f.presetId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!isOwner}
                  aria-pressed={chosen}
                  onClick={() => setF({ ...f, presetId: p.id })}
                  className={clsx(
                    "block w-full border-2 bg-white p-4 text-left",
                    chosen ? "border-primary" : "border-rule hover:border-ink-muted",
                  )}
                >
                  <span className="flex h-14 overflow-hidden border border-rule" aria-hidden="true">
                    {[c.paper, c.primary, c.accent, c.night].map((hex) => (
                      <span key={hex} className="flex-1" style={{ background: hex }} />
                    ))}
                  </span>
                  <span className="mt-3 block font-display text-xl">
                    {p.label} {chosen ? <span className="text-sm font-semibold text-primary">✓ Chosen</span> : null}
                  </span>
                  <span className="block text-sm text-ink-muted">{p.mood}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-4 border-t border-rule pt-8" aria-labelledby="fonts">
        <h2 id="fonts" className="font-display text-2xl">
          Fonts
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(fontPresets) as FontPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              disabled={!isOwner}
              aria-pressed={f.font === key}
              onClick={() => setF({ ...f, font: key })}
              className={clsx(
                "block border-2 bg-white p-4 text-left",
                f.font === key ? "border-primary" : "border-rule hover:border-ink-muted",
              )}
            >
              <span className="block text-sm text-ink-muted">{fontPresets[key].label}</span>
              {f.font === key ? <span className="text-sm font-semibold text-primary">✓ Chosen</span> : null}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink-muted">
          Your site shows the fonts after you save. Headings use the first font, text uses the second.
        </p>
      </section>

      {isOwner ? (
        <div className="sticky bottom-0 z-20 -mx-[var(--gutter)] border-t border-rule bg-paper/95 px-[var(--gutter)] py-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className={buttonClasses("primary", "min-w-40")} onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
