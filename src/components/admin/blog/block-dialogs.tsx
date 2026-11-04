"use client";

import { useId, useState } from "react";
import { ASPECTS, safeLink, type Aspect } from "@/lib/blog/content";
import { aspectLabels, cropStyles } from "@/lib/blog/crop";
import { parseVideoEmbed } from "@/lib/blog/video";
import { Field, Select, TextArea, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { PhotoChooser } from "@/components/admin/banners/photo-chooser";
import { LinkPicker } from "./link-picker";
import { Modal } from "./modal";

type Attrs = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

const useUid = () => `bd${useId().replace(/:/g, "")}`;

// ─── Photo ───────────────────────────────────────────────────────────────────
export function ImageDialog({
  attrs,
  open,
  onClose,
  onSave,
}: {
  attrs: Attrs;
  open: boolean;
  onClose: () => void;
  onSave: (next: Attrs) => void;
}) {
  const uid = useUid();
  const [d, setD] = useState<Attrs>(attrs);
  const set = (patch: Attrs) => setD((now) => ({ ...now, ...patch }));
  const aspect = (ASPECTS as readonly string[]).includes(str(d.aspect)) ? (d.aspect as Aspect) : "original";
  const view = cropStyles({ aspect, zoom: num(d.zoom, 1), focalX: num(d.focalX, 0.5), focalY: num(d.focalY, 0.5) });
  const thumb = str(d.thumb);
  const href = str(d.href);
  const linkOk = !href || Boolean(safeLink(href));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit photo"
      wide
      footer={
        <>
          <button type="button" className={buttonClasses("quiet", "py-2")} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!linkOk}
            className={buttonClasses("primary", "py-2 disabled:opacity-40")}
            onClick={() => onSave({ ...d, href: href.trim() ? href.trim() : null })}
          >
            Done
          </button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">Click the photo to choose the part that should stay in view.</p>
          <div style={view.frame} className="relative max-h-[22rem] overflow-hidden bg-surface">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt=""
                className="h-auto w-full cursor-crosshair"
                style={view.img}
                onClick={(e) => {
                  const box = (e.currentTarget.parentElement ?? e.currentTarget).getBoundingClientRect();
                  set({
                    focalX: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
                    focalY: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
                  });
                }}
              />
            ) : (
              <p className="p-6 text-ink-muted">No preview</p>
            )}
          </div>
          <PhotoChooser
            label="Replace this photo"
            onChoose={(p) => set({ mediaId: p.id, thumb: p.thumb })}
          />
        </div>
        <div className="space-y-4">
          <Field id={`${uid}-alt`} label="Describe the photo" hint="For people who can't see it, and for search engines.">
            <TextInput id={`${uid}-alt`} hasHint value={str(d.alt)} maxLength={200} onChange={(e) => set({ alt: e.target.value })} />
          </Field>
          <Field id={`${uid}-cap`} label="Caption (optional)">
            <TextInput id={`${uid}-cap`} value={str(d.caption)} maxLength={300} onChange={(e) => set({ caption: e.target.value })} />
          </Field>
          <Field id={`${uid}-layout`} label="Placement">
            <Select id={`${uid}-layout`} value={str(d.layout) || "normal"} onChange={(e) => set({ layout: e.target.value })}>
              <option value="normal">In the text</option>
              <option value="wide">Wide</option>
              <option value="left">Text wraps around it (photo on the left)</option>
              <option value="right">Text wraps around it (photo on the right)</option>
            </Select>
          </Field>
          <Field id={`${uid}-aspect`} label="Shape" hint="Changes how the photo is shown, never the photo itself.">
            <Select id={`${uid}-aspect`} value={aspect} onChange={(e) => set({ aspect: e.target.value })}>
              {ASPECTS.map((a) => (
                <option key={a} value={a}>
                  {aspectLabels[a]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id={`${uid}-zoom`} label={`Zoom: ${num(d.zoom, 1).toFixed(1)}×`}>
            <input
              id={`${uid}-zoom`}
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={num(d.zoom, 1)}
              onChange={(e) => set({ zoom: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <button
            type="button"
            className={buttonClasses("secondary", "py-2")}
            onClick={() => set({ aspect: "original", zoom: 1, focalX: 0.5, focalY: 0.5 })}
          >
            Restore the original
          </button>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Make the photo a link (optional)</p>
            <LinkPicker id={`${uid}-href`} value={href} onChange={(v) => set({ href: v })} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────
type Item = { mediaId: string; thumb: string | null; alt: string; caption: string };

export function GalleryDialog({
  attrs,
  open,
  onClose,
  onSave,
}: {
  attrs: Attrs;
  open: boolean;
  onClose: () => void;
  onSave: (next: Attrs) => void;
}) {
  const uid = useUid();
  const [d, setD] = useState<Attrs>(attrs);
  const items = (Array.isArray(d.items) ? d.items : []) as Item[];
  const set = (patch: Attrs) => setD((now) => ({ ...now, ...patch }));
  const setItems = (next: Item[]) => set({ items: next });
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit gallery"
      wide
      footer={
        <>
          <button type="button" className={buttonClasses("quiet", "py-2")} onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={!items.length} className={buttonClasses("primary", "py-2 disabled:opacity-40")} onClick={() => onSave(d)}>
            Done
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`${uid}-layout`} label="Layout">
          <Select id={`${uid}-layout`} value={str(d.layout) || "grid"} onChange={(e) => set({ layout: e.target.value })}>
            <option value="grid">Grid</option>
            <option value="masonry">Staggered</option>
            <option value="slideshow">Slideshow</option>
            <option value="pair">Side by side</option>
          </Select>
        </Field>
        <Field id={`${uid}-cols`} label="Columns">
          <Select id={`${uid}-cols`} value={String(num(d.columns, 3))} onChange={(e) => set({ columns: Number(e.target.value) })}>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </Select>
        </Field>
        <Field id={`${uid}-aspect`} label="Photo shape">
          <Select id={`${uid}-aspect`} value={str(d.aspect) || "original"} onChange={(e) => set({ aspect: e.target.value })}>
            {ASPECTS.map((a) => (
              <option key={a} value={a}>
                {aspectLabels[a]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <PhotoChooser
        label="Add photos"
        onChooseMany={(photos) =>
          setItems([
            ...items,
            ...photos
              .filter((p) => !items.some((i) => i.mediaId === p.id))
              .map((p) => ({ mediaId: p.id, thumb: p.thumb, alt: "", caption: "" })),
          ].slice(0, 40))
        }
      />
      {items.length === 0 ? <p className="text-ink-muted">No photos yet. Add some above.</p> : null}
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={it.mediaId} className="flex gap-3 border border-rule bg-white p-2">
            {it.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.thumb} alt="" className="h-20 w-24 shrink-0 object-cover" />
            ) : (
              <span className="h-20 w-24 shrink-0 bg-surface" />
            )}
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-alt-${i}`} className="sr-only">
                  Description of photo {i + 1}
                </label>
                <TextInput
                  id={`${uid}-alt-${i}`}
                  className="min-h-11"
                  placeholder="Describe the photo"
                  value={it.alt}
                  maxLength={200}
                  onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-cap-${i}`} className="sr-only">
                  Caption for photo {i + 1}
                </label>
                <TextInput
                  id={`${uid}-cap-${i}`}
                  className="min-h-11"
                  placeholder="Caption (optional)"
                  value={it.caption}
                  maxLength={300}
                  onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))}
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-col">
              <button type="button" aria-label={`Move photo ${i + 1} earlier`} disabled={i === 0} className="min-h-9 min-w-9 hover:bg-surface disabled:opacity-30" onClick={() => move(i, -1)}>
                ↑
              </button>
              <button type="button" aria-label={`Move photo ${i + 1} later`} disabled={i === items.length - 1} className="min-h-9 min-w-9 hover:bg-surface disabled:opacity-30" onClick={() => move(i, 1)}>
                ↓
              </button>
              <button type="button" aria-label={`Remove photo ${i + 1}`} className="min-h-9 min-w-9 text-[#8a2b1d] hover:bg-surface" onClick={() => setItems(items.filter((_, k) => k !== i))}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

// ─── Video ───────────────────────────────────────────────────────────────────
export function VideoDialog({
  attrs,
  open,
  onClose,
  onSave,
}: {
  attrs: Attrs;
  open: boolean;
  onClose: () => void;
  onSave: (next: Attrs) => void;
}) {
  const uid = useUid();
  const [link, setLink] = useState(str(attrs.url));
  const [caption, setCaption] = useState(str(attrs.caption));
  const parsed = link.trim() ? parseVideoEmbed(link) : null;
  const bad = link.trim() !== "" && !parsed;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Video"
      footer={
        <>
          <button type="button" className={buttonClasses("quiet", "py-2")} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!parsed}
            className={buttonClasses("primary", "py-2 disabled:opacity-40")}
            onClick={() => parsed && onSave({ provider: parsed.provider, videoId: parsed.videoId, url: parsed.url, caption: caption.trim() })}
          >
            Done
          </button>
        </>
      }
    >
      <Field id={`${uid}-url`} label="Video link" hint="Paste a YouTube or Vimeo link. You never need embed code." error={bad ? "That isn't a YouTube or Vimeo link." : undefined}>
        <TextInput id={`${uid}-url`} hasHint invalid={bad} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
      </Field>
      {parsed ? <p className="text-sm text-primary">Found a {parsed.provider === "youtube" ? "YouTube" : "Vimeo"} video.</p> : null}
      <Field id={`${uid}-cap`} label="Caption (optional)">
        <TextInput id={`${uid}-cap`} value={caption} maxLength={300} onChange={(e) => setCaption(e.target.value)} />
      </Field>
    </Modal>
  );
}

// ─── Button / call to action ─────────────────────────────────────────────────
export function CtaDialog({
  attrs,
  open,
  onClose,
  onSave,
}: {
  attrs: Attrs;
  open: boolean;
  onClose: () => void;
  onSave: (next: Attrs) => void;
}) {
  const uid = useUid();
  const [d, setD] = useState<Attrs>(attrs);
  const set = (patch: Attrs) => setD((now) => ({ ...now, ...patch }));
  const href = str(d.href);
  const label = str(d.label).trim();
  const ready = Boolean(label) && Boolean(safeLink(href));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Button"
      footer={
        <>
          <button type="button" className={buttonClasses("quiet", "py-2")} onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={!ready} className={buttonClasses("primary", "py-2 disabled:opacity-40")} onClick={() => onSave({ ...d, label, href: href.trim() })}>
            Done
          </button>
        </>
      }
    >
      <Field id={`${uid}-label`} label="Button words" hint="For example: See our horses, Ask about this colt.">
        <TextInput id={`${uid}-label`} hasHint value={str(d.label)} maxLength={40} onChange={(e) => set({ label: e.target.value })} />
      </Field>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">Where it goes</p>
        <LinkPicker id={`${uid}-href`} value={href} onChange={(v) => set({ href: v })} />
      </div>
      <Field id={`${uid}-heading`} label="Heading above the button (optional)">
        <TextInput id={`${uid}-heading`} value={str(d.heading)} maxLength={120} onChange={(e) => set({ heading: e.target.value })} />
      </Field>
      <Field id={`${uid}-text`} label="A sentence of explanation (optional)">
        <TextArea id={`${uid}-text`} rows={2} value={str(d.text)} maxLength={400} onChange={(e) => set({ text: e.target.value })} />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <PhotoChooser label={d.mediaId ? "Change picture" : "Add a picture (optional)"} onChoose={(p) => set({ mediaId: p.id, thumb: p.thumb })} />
        {d.mediaId ? (
          <button type="button" className={buttonClasses("quiet", "py-2")} onClick={() => set({ mediaId: null, thumb: null })}>
            Remove picture
          </button>
        ) : null}
      </div>
    </Modal>
  );
}

// ─── Link on selected text ───────────────────────────────────────────────────
export function LinkDialog({
  initial,
  open,
  onClose,
  onSave,
  onRemove,
}: {
  initial: string;
  open: boolean;
  onClose: () => void;
  onSave: (href: string) => void;
  onRemove: () => void;
}) {
  const uid = useUid();
  const [href, setHref] = useState(initial);
  const ok = Boolean(safeLink(href));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link"
      footer={
        <>
          {initial ? (
            <button type="button" className={buttonClasses("quiet", "py-2")} onClick={onRemove}>
              Remove link
            </button>
          ) : null}
          <button type="button" disabled={!ok} className={buttonClasses("primary", "py-2 disabled:opacity-40")} onClick={() => onSave(href.trim())}>
            Done
          </button>
        </>
      }
    >
      <LinkPicker id={`${uid}-href`} value={href} onChange={setHref} />
    </Modal>
  );
}
