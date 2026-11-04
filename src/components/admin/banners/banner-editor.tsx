"use client";

import { useState } from "react";
import { saveBannerAction } from "@/lib/admin/banners/actions";
import type { BannerRow } from "@/lib/admin/banners/service";
import { Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { PhotoChooser } from "./photo-chooser";

/**
 * One page's banner: the photo (from the Photo Library) and, unless it is a category page,
 * a headline and subheadline. Left blank, a page uses its own title.
 */
export function BannerEditor({
  pageKey,
  label,
  imageOnly,
  initial,
}: {
  pageKey: string;
  label: string;
  imageOnly?: boolean;
  initial?: BannerRow;
}) {
  const id = pageKey.replace(/[^a-z0-9]/gi, "-");
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const [subheadline, setSubheadline] = useState(initial?.subheadline ?? "");
  const [photo, setPhoto] = useState<{ id: string | null; thumb: string | null }>({
    id: initial?.mediaId ?? null,
    thumb: initial?.thumb ?? null,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    const r = await saveBannerAction(pageKey, { headline, subheadline, mediaId: photo.id });
    setBusy(false);
    setMessage(r.ok ? { tone: "success", text: "Saved." } : { tone: "error", text: r.message });
  }

  return (
    <section aria-labelledby={`${id}-title`} className="border border-rule bg-white p-5">
      <h2 id={`${id}-title`} className="font-display text-xl">
        {label}
      </h2>
      <div className="mt-4 grid gap-6 md:grid-cols-[16rem_1fr]">
        <PhotoChooser
          label={photo.id ? "Change photo" : "Choose photo"}
          onChoose={(p) => setPhoto({ id: p.id, thumb: p.thumb })}
          trigger={(open) => (
            <div className="space-y-3">
              {/* The picture itself is the button: click it to choose or change the photo. */}
              <button
                type="button"
                onClick={open}
                aria-label={photo.id ? "Change photo" : "Choose a photo"}
                className="group relative block w-full text-left focus-visible:outline-2 focus-visible:outline-primary"
              >
                {photo.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.thumb} alt="" className="aspect-[16/9] w-full border border-rule object-cover" />
                ) : (
                  <span className="flex aspect-[16/9] w-full items-center justify-center border border-dashed border-rule bg-surface px-3 text-center text-sm text-ink-muted group-hover:border-primary group-hover:text-ink">
                    {photo.id
                      ? "Photo chosen"
                      : imageOnly
                        ? "No photo: no banner. Click to choose."
                        : "No photo yet. Click to choose."}
                  </span>
                )}
              </button>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={buttonClasses("secondary", "py-2")} onClick={open}>
                  {photo.id ? "Change photo" : "Choose photo"}
                </button>
                {photo.id ? (
                  <button
                    type="button"
                    className={buttonClasses("quiet", "py-2")}
                    onClick={() => setPhoto({ id: null, thumb: null })}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          )}
        />
        <div className="space-y-4">
          {imageOnly ? (
            <p className="text-sm text-ink-muted">
              Category pages show just the photo across the top. With no photo there is no banner.
            </p>
          ) : (
            <>
              <Field id={`${id}-headline`} label="Headline" hint="Leave blank to use the page's own title.">
                <TextInput
                  id={`${id}-headline`}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={120}
                  hasHint
                />
              </Field>
              <Field id={`${id}-sub`} label="Subheadline (optional)">
                <TextInput
                  id={`${id}-sub`}
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  maxLength={240}
                />
              </Field>
            </>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={buttonClasses("primary", "py-2")} onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
