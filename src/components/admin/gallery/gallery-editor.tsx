"use client";

import { useState } from "react";
import { saveGalleryAction } from "@/lib/admin/gallery/actions";
import type { GalleryData, GalleryPhoto } from "@/lib/admin/gallery/service";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

function Thumb({ p }: { p: GalleryPhoto }) {
  return p.thumb ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.thumb} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
  ) : (
    <span className="block aspect-[4/3] bg-surface" />
  );
}

/** Pick which photos appear in the gallery, and put them in order. Click a photo below to add it. */
export function GalleryEditor({ initial }: { initial: GalleryData }) {
  const [inGallery, setIn] = useState(initial.inGallery);
  const [others, setOthers] = useState(initial.others);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const add = (p: GalleryPhoto) => {
    setIn((g) => [...g, p]);
    setOthers((o) => o.filter((x) => x.id !== p.id));
  };
  const remove = (p: GalleryPhoto) => {
    setIn((g) => g.filter((x) => x.id !== p.id));
    setOthers((o) => [p, ...o]);
  };
  const move = (i: number, by: -1 | 1) =>
    setIn((g) => {
      const j = i + by;
      if (j < 0 || j >= g.length) return g;
      const next = [...g];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function save() {
    setBusy(true);
    setMessage(null);
    const r = await saveGalleryAction(inGallery.map((p) => p.id));
    setBusy(false);
    setMessage(
      r.ok ? { tone: "success", text: "Saved. Your gallery is updated." } : { tone: "error", text: r.message },
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4" aria-labelledby="in-gallery">
        <h2 id="in-gallery" className="font-display text-2xl">
          In your gallery ({inGallery.length})
        </h2>
        {inGallery.length === 0 ? <p className="text-ink-muted">Nothing yet. Click photos below to add them.</p> : null}
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {inGallery.map((p, i) => (
            <li key={p.id} className="space-y-2 border border-rule bg-white p-2">
              <Thumb p={p} />
              <div className="flex flex-wrap items-center gap-1 text-sm">
                <span className="mr-auto tabular-nums text-ink-muted">{i + 1}</span>
                <button
                  type="button"
                  className={buttonClasses("quiet", "px-2 py-1")}
                  aria-label={`Move ${p.name} earlier`}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  ←
                </button>
                <button
                  type="button"
                  className={buttonClasses("quiet", "px-2 py-1")}
                  aria-label={`Move ${p.name} later`}
                  onClick={() => move(i, 1)}
                  disabled={i === inGallery.length - 1}
                >
                  →
                </button>
                <button type="button" className={buttonClasses("quiet", "px-2 py-1")} onClick={() => remove(p)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4 border-t border-rule pt-8" aria-labelledby="others">
        <h2 id="others" className="font-display text-2xl">
          Your other photos
        </h2>
        <p className="text-ink-muted">Click a photo to add it to the gallery.</p>
        {others.length === 0 ? (
          <p className="text-ink-muted">All your photos are in the gallery, or you haven&apos;t uploaded any yet.</p>
        ) : null}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {others.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => add(p)}
                className="block w-full border border-rule bg-white text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Thumb p={p} />
                <span className="block truncate px-2 py-1 text-xs text-ink-muted">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

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
