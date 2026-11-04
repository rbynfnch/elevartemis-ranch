"use client";

import { useState } from "react";
import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import clsx from "clsx";
import { ASPECTS, CALLOUT_TONES, type Aspect } from "@/lib/blog/content";
import { aspectRatio, cropStyles } from "@/lib/blog/crop";
import { PhotoChooser } from "@/components/admin/banners/photo-chooser";
import { CtaDialog, GalleryDialog, ImageDialog, VideoDialog } from "./block-dialogs";

type Attrs = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const btn = "min-h-9 border border-rule bg-white px-3 text-sm hover:bg-surface";

function Frame({ selected, label, children, actions }: { selected: boolean; label: string; children: React.ReactNode; actions: React.ReactNode }) {
  return (
    <NodeViewWrapper
      data-drag-handle
      className={clsx("my-5 border bg-white p-3", selected ? "border-primary ring-2 ring-primary/40" : "border-rule")}
    >
      <div contentEditable={false} className="space-y-2">
        {children}
        <div className="flex flex-wrap items-center gap-2" aria-label={`${label} options`}>
          {actions}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// ─── Photo ───────────────────────────────────────────────────────────────────
export function ImageView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const a = node.attrs as Attrs;
  const [editing, setEditing] = useState(false);
  const aspect = (ASPECTS as readonly string[]).includes(str(a.aspect)) ? (a.aspect as Aspect) : "original";
  const view = cropStyles({ aspect, zoom: num(a.zoom, 1), focalX: num(a.focalX, 0.5), focalY: num(a.focalY, 0.5) });
  const layout = str(a.layout);
  const thumb = str(a.thumb);
  return (
    <Frame
      selected={selected}
      label="Photo"
      actions={
        <>
          <button type="button" className={btn} onClick={() => setEditing(true)}>
            Edit photo
          </button>
          <PhotoChooser label="Replace" onChoose={(p) => updateAttributes({ mediaId: p.id, thumb: p.thumb })} trigger={(open) => (
            <button type="button" className={btn} onClick={open}>Replace</button>
          )} />
          <button type="button" className={btn} onClick={() => deleteNode()}>
            Remove
          </button>
          <span className="text-xs text-ink-muted">
            {{ normal: "In the text", wide: "Wide", left: "Wraps, left", right: "Wraps, right" }[layout] ?? "In the text"}
            {a.alt ? "" : " · no description yet"}
          </span>
        </>
      }
    >
      <div className={clsx(layout === "left" || layout === "right" ? "w-1/2" : "w-full", layout === "right" && "ml-auto")}>
        <div style={view.frame} className="bg-surface">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={str(a.alt)} className="h-auto w-full" style={view.img} />
          ) : (
            <p className="p-6 text-sm text-ink-muted">This photo has no preview here, but will still show on the site.</p>
          )}
        </div>
      </div>
      <label className="block">
        <span className="sr-only">Caption</span>
        <input
          value={str(a.caption)}
          maxLength={300}
          placeholder="Add a caption (optional)"
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          className="block w-full border-0 border-b border-rule bg-transparent py-1 text-sm italic focus:border-primary focus:outline-none"
        />
      </label>
      {editing ? (
        <ImageDialog
          attrs={a}
          open
          onClose={() => setEditing(false)}
          onSave={(next) => {
            updateAttributes(next);
            setEditing(false);
          }}
        />
      ) : null}
    </Frame>
  );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────
export function GalleryView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const a = node.attrs as Attrs;
  const [editing, setEditing] = useState(false);
  const items = (Array.isArray(a.items) ? a.items : []) as { mediaId: string; thumb: string | null }[];
  const aspect = (ASPECTS as readonly string[]).includes(str(a.aspect)) ? (a.aspect as Aspect) : "original";
  return (
    <Frame
      selected={selected}
      label="Gallery"
      actions={
        <>
          <button type="button" className={btn} onClick={() => setEditing(true)}>
            Edit gallery
          </button>
          <button type="button" className={btn} onClick={() => deleteNode()}>
            Remove
          </button>
          <span className="text-xs text-ink-muted">
            {items.length} photo{items.length === 1 ? "" : "s"} · {str(a.layout) || "grid"}
          </span>
        </>
      }
    >
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(2, num(a.columns, 3)))}, minmax(0, 1fr))` }}>
        {items.slice(0, 8).map((it) => (
          <div key={it.mediaId} className="overflow-hidden bg-surface" style={{ aspectRatio: aspectRatio(aspect) ?? "4 / 3" }}>
            {it.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.thumb} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
        ))}
      </div>
      {items.length > 8 ? <p className="text-xs text-ink-muted">and {items.length - 8} more</p> : null}
      {editing ? (
        <GalleryDialog
          attrs={a}
          open
          onClose={() => setEditing(false)}
          onSave={(next) => {
            updateAttributes(next);
            setEditing(false);
          }}
        />
      ) : null}
    </Frame>
  );
}

// ─── Video ───────────────────────────────────────────────────────────────────
export function VideoView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const a = node.attrs as Attrs;
  const [editing, setEditing] = useState(false);
  return (
    <Frame
      selected={selected}
      label="Video"
      actions={
        <>
          <button type="button" className={btn} onClick={() => setEditing(true)}>
            Change video
          </button>
          <button type="button" className={btn} onClick={() => deleteNode()}>
            Remove
          </button>
        </>
      }
    >
      <div className="flex aspect-video items-center justify-center bg-night text-center text-white">
        <div>
          <p className="text-3xl" aria-hidden="true">
            ▶
          </p>
          <p className="text-sm">{a.provider === "vimeo" ? "Vimeo" : "YouTube"} video</p>
          <p className="text-xs opacity-70">It plays on your site, not here.</p>
        </div>
      </div>
      {str(a.caption) ? <p className="text-sm italic">{str(a.caption)}</p> : null}
      {editing ? (
        <VideoDialog
          attrs={a}
          open
          onClose={() => setEditing(false)}
          onSave={(next) => {
            updateAttributes(next);
            setEditing(false);
          }}
        />
      ) : null}
    </Frame>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
export function CtaView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const a = node.attrs as Attrs;
  const [editing, setEditing] = useState(false);
  return (
    <Frame
      selected={selected}
      label="Button"
      actions={
        <>
          <button type="button" className={btn} onClick={() => setEditing(true)}>
            Edit button
          </button>
          <button type="button" className={btn} onClick={() => deleteNode()}>
            Remove
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-4 border border-rule bg-surface p-4">
        {str(a.thumb) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={str(a.thumb)} alt="" className="h-20 w-28 object-cover" />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          {str(a.heading) ? <p className="font-display text-lg">{str(a.heading)}</p> : null}
          {str(a.text) ? <p className="text-sm">{str(a.text)}</p> : null}
          <span className="inline-block bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{str(a.label) || "Button"}</span>
          <p className="truncate text-xs text-ink-muted">{str(a.href)}</p>
        </div>
      </div>
      {editing ? (
        <CtaDialog
          attrs={a}
          open
          onClose={() => setEditing(false)}
          onSave={(next) => {
            updateAttributes(next);
            setEditing(false);
          }}
        />
      ) : null}
    </Frame>
  );
}

// ─── Callout ─────────────────────────────────────────────────────────────────
const tones = {
  info: { label: "Note", cls: "border-primary bg-primary/5" },
  tip: { label: "Tip", cls: "border-accent bg-accent/10" },
  warning: { label: "Important", cls: "border-[#8a2b1d] bg-[#8a2b1d]/5" },
} as const;

export function CalloutView({ node, updateAttributes }: ReactNodeViewProps) {
  const tone = (CALLOUT_TONES as readonly string[]).includes(str(node.attrs.tone)) ? (node.attrs.tone as keyof typeof tones) : "info";
  return (
    <NodeViewWrapper className={clsx("my-5 border-l-4 p-4", tones[tone].cls)}>
      <div contentEditable={false} className="mb-2 flex gap-1" role="group" aria-label="Callout style">
        {CALLOUT_TONES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === tone}
            onClick={() => updateAttributes({ tone: t })}
            className={clsx("min-h-8 px-2 text-xs font-semibold uppercase tracking-wide", t === tone ? "bg-primary text-on-primary" : "bg-white hover:bg-surface")}
          >
            {tones[t].label}
          </button>
        ))}
      </div>
      <NodeViewContent className="[&>*+*]:mt-2" />
    </NodeViewWrapper>
  );
}
