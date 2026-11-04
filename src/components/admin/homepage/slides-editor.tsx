"use client";

import { useState } from "react";
import { saveSlidesAction } from "@/lib/admin/homepage/actions";
import { searchAnimalsAction } from "@/lib/admin/library/actions";
import type { SlideForm } from "@/lib/admin/homepage/service";
import { MAX_SLIDES, slidePages } from "@/lib/admin/homepage/fields";
import { Checkbox, Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { PhotoPick } from "@/components/admin/banners/photo-pick";

type Category = { id: string; label: string; species: string };

const blank = (): SlideForm => ({
  id: null,
  mediaId: null,
  headline: "",
  subheadline: "",
  ctaLabel: "",
  ctaKind: "none",
  ctaPage: "",
  ctaCategoryId: null,
  ctaAnimalId: null,
  ctaUrl: "",
  isActive: true,
  thumb: null,
  animalName: null,
});

/** Up to three big photos for the top of the home page, each with a headline and an optional button. */
export function SlidesEditor({ initial, categories }: { initial: SlideForm[]; categories: Category[] }) {
  const [slides, setSlides] = useState<SlideForm[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState<{
    index: number;
    text: string;
    results: { id: string; name: string; detail: string }[];
  } | null>(null);

  const patch = (i: number, p: Partial<SlideForm>) => setSlides((s) => s.map((x, n) => (n === i ? { ...x, ...p } : x)));
  const move = (i: number, by: -1 | 1) =>
    setSlides((s) => {
      const j = i + by;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function save() {
    setBusy(true);
    setMessage(null);
    const r = await saveSlidesAction(
      slides.map((s) => ({
        id: s.id,
        mediaId: s.mediaId,
        headline: s.headline,
        subheadline: s.subheadline,
        ctaLabel: s.ctaLabel,
        ctaKind: s.ctaKind,
        ctaPage: s.ctaPage,
        ctaCategoryId: s.ctaCategoryId,
        ctaAnimalId: s.ctaAnimalId,
        ctaUrl: s.ctaUrl,
        isActive: s.isActive,
      })),
    );
    setBusy(false);
    setMessage(
      r.ok
        ? { tone: "success", text: "Saved. Your home page is updated. Reload this page to see new slides' details." }
        : { tone: "error", text: r.message },
    );
  }

  async function search(i: number, text: string) {
    if (text.trim().length < 2) return setQuery({ index: i, text, results: [] });
    const r = await searchAnimalsAction(text);
    setQuery({ index: i, text, results: r.ok ? r.data : [] });
  }

  return (
    <div className="space-y-8">
      <p className="max-w-[62ch] text-ink-muted">
        The first thing visitors see. Add up to {MAX_SLIDES} big photos, each with a headline and, if you like, a button
        to a page or an animal. With more than one, they change on their own.
      </p>

      {slides.length === 0 ? (
        <p className="text-ink-muted">No slides yet. Your home page shows your tagline until you add one.</p>
      ) : null}

      <ol className="space-y-6">
        {slides.map((s, i) => (
          <li key={s.id ?? `new-${i}`} className="space-y-5 border border-rule bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl">Slide {i + 1}</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonClasses("quiet", "py-2")}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className={buttonClasses("quiet", "py-2")}
                  onClick={() => move(i, 1)}
                  disabled={i === slides.length - 1}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className={buttonClasses("quiet", "py-2")}
                  onClick={() =>
                    window.confirm("Remove this slide?") && setSlides((all) => all.filter((_, n) => n !== i))
                  }
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
              <PhotoPick
                label="Photo"
                photo={{ id: s.mediaId, thumb: s.thumb }}
                onChange={(p) => patch(i, { mediaId: p.id, thumb: p.thumb })}
              />
              <div className="space-y-4">
                <Field id={`sl-head-${i}`} label="Headline">
                  <TextInput
                    id={`sl-head-${i}`}
                    maxLength={120}
                    value={s.headline}
                    onChange={(e) => patch(i, { headline: e.target.value })}
                  />
                </Field>
                <Field id={`sl-sub-${i}`} label="Subheadline (optional)">
                  <TextInput
                    id={`sl-sub-${i}`}
                    maxLength={240}
                    value={s.subheadline}
                    onChange={(e) => patch(i, { subheadline: e.target.value })}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={`sl-kind-${i}`} label="Button">
                    <select
                      id={`sl-kind-${i}`}
                      value={s.ctaKind}
                      onChange={(e) => patch(i, { ctaKind: e.target.value as SlideForm["ctaKind"] })}
                      className="min-h-12 w-full border border-rule bg-white px-3 text-base"
                    >
                      <option value="none">No button</option>
                      <option value="page">A page on your site</option>
                      <option value="category">A category (Bulls, Mares…)</option>
                      <option value="animal">One animal</option>
                      <option value="external">Another website</option>
                    </select>
                  </Field>
                  {s.ctaKind !== "none" ? (
                    <Field id={`sl-label-${i}`} label="Button words">
                      <TextInput
                        id={`sl-label-${i}`}
                        maxLength={40}
                        value={s.ctaLabel}
                        onChange={(e) => patch(i, { ctaLabel: e.target.value })}
                      />
                    </Field>
                  ) : null}
                </div>
                {s.ctaKind === "page" ? (
                  <Field id={`sl-page-${i}`} label="Which page">
                    <select
                      id={`sl-page-${i}`}
                      value={s.ctaPage}
                      onChange={(e) => patch(i, { ctaPage: e.target.value })}
                      className="min-h-12 w-full max-w-sm border border-rule bg-white px-3 text-base"
                    >
                      <option value="">Choose a page</option>
                      {slidePages.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                {s.ctaKind === "category" ? (
                  <Field id={`sl-cat-${i}`} label="Which category">
                    <select
                      id={`sl-cat-${i}`}
                      value={s.ctaCategoryId ?? ""}
                      onChange={(e) => patch(i, { ctaCategoryId: e.target.value || null })}
                      className="min-h-12 w-full max-w-sm border border-rule bg-white px-3 text-base"
                    >
                      <option value="">Choose a category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.species === "horse" ? "Horses" : "Cattle"}: {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                {s.ctaKind === "animal" ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Which animal{s.animalName ? `: ${s.animalName}` : ""}</p>
                    <TextInput
                      id={`sl-animal-${i}`}
                      placeholder="Search your animals by name"
                      autoComplete="off"
                      value={query?.index === i ? query.text : ""}
                      onChange={(e) => search(i, e.target.value)}
                      className="max-w-md"
                    />
                    {query?.index === i && query.results.length > 0 ? (
                      <ul className="max-w-md divide-y divide-rule border border-rule bg-white">
                        {query.results.map((a) => (
                          <li key={a.id}>
                            <button
                              type="button"
                              className="flex min-h-11 w-full items-center justify-between px-3 text-left hover:bg-surface"
                              onClick={() => {
                                patch(i, { ctaAnimalId: a.id, animalName: a.name });
                                setQuery(null);
                              }}
                            >
                              <span>{a.name}</span>
                              <span className="text-sm text-ink-muted">{a.detail}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {s.ctaKind === "external" ? (
                  <Field id={`sl-url-${i}`} label="Address" hint="Starting with https://">
                    <TextInput
                      id={`sl-url-${i}`}
                      maxLength={500}
                      value={s.ctaUrl}
                      onChange={(e) => patch(i, { ctaUrl: e.target.value })}
                      hasHint
                    />
                  </Field>
                ) : null}
                <Checkbox
                  name={`active-${i}`}
                  label="Show this slide"
                  checked={s.isActive}
                  onChange={(e) => patch(i, { isActive: e.target.checked })}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>

      {slides.length < MAX_SLIDES ? (
        <button type="button" className={buttonClasses("secondary")} onClick={() => setSlides((s) => [...s, blank()])}>
          Add a slide
        </button>
      ) : null}

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
