/**
 * The blog's content format: a versioned block document (ProseMirror/Tiptap JSON), and the one place that decides
 * what is allowed in it. Everything that is saved passes through `sanitizeDoc`, which rebuilds the document from an
 * allowlist, so a crafted request cannot store scripts, unknown blocks, unsafe links or other ranches' photos.
 * The public renderer is an allowlist too. Pure functions, no database.
 */
export const CONTENT_VERSION = 2;

export const ASPECTS = ["original", "16:9", "4:3", "3:2", "1:1", "4:5"] as const;
export type Aspect = (typeof ASPECTS)[number];
export const IMAGE_LAYOUTS = ["normal", "wide", "left", "right"] as const;
export const GALLERY_LAYOUTS = ["grid", "masonry", "slideshow", "pair"] as const;
export const CALLOUT_TONES = ["info", "tip", "warning"] as const;
export const ALIGNS = ["left", "center", "right"] as const;

export type Json = { [k: string]: unknown };
export type DocNode = {
  type: string;
  attrs?: Json;
  content?: DocNode[];
  text?: string;
  marks?: { type: string; attrs?: Json }[];
};
export type Doc = { type: "doc"; content: DocNode[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

const MAX_BLOCKS = 400;
const MAX_DEPTH = 5;
const MAX_TEXT = 20_000;
const MAX_GALLERY_ITEMS = 40;

const str = (v: unknown, max: number): string =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
        .trim()
        .slice(0, max)
    : "";
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback;
const num = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** A link target we allow: a page on this site, an https or http address, email or phone. Anything else is null. */
export function safeLink(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const href = raw.trim();
  if (!href || href.length > 600 || /[\s\u0000-\u001f]/.test(href)) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) return href;
  return null;
}

/** A preview address for the editor: only https addresses are kept. The site itself never trusts it. */
const preview = (v: unknown): string | null =>
  typeof v === "string" && /^https:\/\/[^\s"'<>]{1,500}$/.test(v) ? v : null;

// ─── Inline content ──────────────────────────────────────────────────────────
function cleanMarks(raw: unknown): DocNode["marks"] {
  if (!Array.isArray(raw)) return undefined;
  const marks: NonNullable<DocNode["marks"]> = [];
  for (const m of raw) {
    const type = (m as { type?: unknown })?.type;
    if (type === "bold" || type === "italic" || type === "underline") marks.push({ type });
    else if (type === "link") {
      const href = safeLink(((m as { attrs?: Json }).attrs ?? {}).href);
      if (href) marks.push({ type: "link", attrs: { href } });
    }
  }
  return marks.length ? marks : undefined;
}

function cleanInline(raw: unknown): DocNode[] {
  if (!Array.isArray(raw)) return [];
  const out: DocNode[] = [];
  for (const n of raw) {
    if (!n || typeof n !== "object") continue;
    const t = (n as DocNode).type;
    if (t === "text") {
      const text =
        typeof (n as DocNode).text === "string"
          ? (n as DocNode).text!.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, MAX_TEXT)
          : "";
      if (text)
        out.push({
          type: "text",
          text,
          ...(cleanMarks((n as DocNode).marks) ? { marks: cleanMarks((n as DocNode).marks) } : {}),
        });
    } else if (t === "hardBreak") out.push({ type: "hardBreak" });
  }
  return out;
}

// ─── Blocks ──────────────────────────────────────────────────────────────────
type Ctx = { dropped: number };

function align(attrs: unknown): Json | undefined {
  const a = (attrs as Json | undefined)?.textAlign;
  return a === "center" || a === "right" ? { textAlign: a } : undefined;
}

function cleanGalleryItems(raw: unknown): Json[] {
  if (!Array.isArray(raw)) return [];
  const items: Json[] = [];
  for (const it of raw.slice(0, MAX_GALLERY_ITEMS)) {
    const o = (it ?? {}) as Json;
    if (!isId(o.mediaId)) continue;
    items.push({ mediaId: o.mediaId, thumb: preview(o.thumb), alt: str(o.alt, 200), caption: str(o.caption, 300) });
  }
  return items;
}

function cleanBlock(n: unknown, depth: number, ctx: Ctx, allowed: "any" | "textOnly"): DocNode | null {
  if (!n || typeof n !== "object" || depth > MAX_DEPTH) {
    ctx.dropped++;
    return null;
  }
  const node = n as DocNode;
  const attrs = (node.attrs ?? {}) as Json;
  const textOnly = allowed === "textOnly";

  switch (node.type) {
    case "paragraph": {
      const content = cleanInline(node.content);
      return {
        type: "paragraph",
        ...(align(attrs) ? { attrs: align(attrs) } : {}),
        ...(content.length ? { content } : {}),
      };
    }
    case "heading": {
      const level = Math.round(num(attrs.level, 2, 4, 2));
      const content = cleanInline(node.content);
      return { type: "heading", attrs: { level, ...(align(attrs) ?? {}) }, ...(content.length ? { content } : {}) };
    }
    case "smallText": {
      const content = cleanInline(node.content);
      return { type: "smallText", ...(content.length ? { content } : {}) };
    }
    case "pullquote": {
      if (textOnly) break;
      const content = cleanInline(node.content);
      return { type: "pullquote", ...(content.length ? { content } : {}) };
    }
    case "horizontalRule":
      return textOnly ? null : { type: "horizontalRule" };
    case "bulletList":
    case "orderedList": {
      const items = (node.content ?? [])
        .map((li) => (li?.type === "listItem" ? cleanListItem(li, depth + 1, ctx) : null))
        .filter((x): x is DocNode => Boolean(x));
      return items.length ? { type: node.type, content: items } : null;
    }
    case "blockquote": {
      if (textOnly) break;
      const content = (node.content ?? [])
        .map((c) => (c?.type === "paragraph" ? cleanBlock(c, depth + 1, ctx, "textOnly") : null))
        .filter((x): x is DocNode => Boolean(x));
      return content.length ? { type: "blockquote", content } : null;
    }
    case "callout": {
      if (textOnly) break;
      const content = (node.content ?? [])
        .map((c) =>
          c && ["paragraph", "bulletList", "orderedList"].includes(c.type)
            ? cleanBlock(c, depth + 1, ctx, "textOnly")
            : null,
        )
        .filter((x): x is DocNode => Boolean(x));
      return {
        type: "callout",
        attrs: { tone: oneOf(attrs.tone, CALLOUT_TONES, "info") },
        content: content.length ? content : [{ type: "paragraph" }],
      };
    }
    case "image": {
      if (textOnly || !isId(attrs.mediaId)) break;
      return {
        type: "image",
        attrs: {
          mediaId: attrs.mediaId,
          thumb: preview(attrs.thumb),
          alt: str(attrs.alt, 200),
          caption: str(attrs.caption, 300),
          layout: oneOf(attrs.layout, IMAGE_LAYOUTS, "normal"),
          aspect: oneOf(attrs.aspect, ASPECTS, "original"),
          zoom: num(attrs.zoom, 1, 3, 1),
          focalX: num(attrs.focalX, 0, 1, 0.5),
          focalY: num(attrs.focalY, 0, 1, 0.5),
          href: safeLink(attrs.href),
        },
      };
    }
    case "gallery": {
      if (textOnly) break;
      const items = cleanGalleryItems(attrs.items);
      if (!items.length) break;
      return {
        type: "gallery",
        attrs: {
          layout: oneOf(attrs.layout, GALLERY_LAYOUTS, "grid"),
          columns: Math.round(num(attrs.columns, 2, 4, 3)),
          aspect: oneOf(attrs.aspect, ASPECTS, "original"),
          items,
        },
      };
    }
    case "video": {
      if (textOnly) break;
      const provider = attrs.provider === "vimeo" ? "vimeo" : attrs.provider === "youtube" ? "youtube" : null;
      const id =
        typeof attrs.videoId === "string" && /^[A-Za-z0-9_-]{3,40}$/.test(attrs.videoId) ? attrs.videoId : null;
      if (!provider || !id) break;
      return {
        type: "video",
        attrs: { provider, videoId: id, url: safeLink(attrs.url), caption: str(attrs.caption, 300) },
      };
    }
    case "cta": {
      if (textOnly) break;
      const href = safeLink(attrs.href);
      const label = str(attrs.label, 40);
      if (!href || !label) break;
      return {
        type: "cta",
        attrs: {
          heading: str(attrs.heading, 120),
          text: str(attrs.text, 400),
          label,
          href,
          mediaId: isId(attrs.mediaId) ? attrs.mediaId : null,
          thumb: isId(attrs.mediaId) ? preview(attrs.thumb) : null,
        },
      };
    }
  }
  ctx.dropped++;
  return null;
}

function cleanListItem(li: DocNode, depth: number, ctx: Ctx): DocNode | null {
  const content = (li.content ?? [])
    .map((c) =>
      c && ["paragraph", "bulletList", "orderedList"].includes(c.type)
        ? cleanBlock(c, depth + 1, ctx, "textOnly")
        : null,
    )
    .filter((x): x is DocNode => Boolean(x));
  return content.length ? { type: "listItem", content } : null;
}

/** Rebuilds a document from the allowlist. `doc` is null when nothing visible is left. */
export function sanitizeDoc(raw: unknown): { doc: Doc | null; dropped: number } {
  const ctx: Ctx = { dropped: 0 };
  if (!raw || typeof raw !== "object" || (raw as DocNode).type !== "doc" || !Array.isArray((raw as DocNode).content))
    return { doc: null, dropped: raw ? 1 : 0 };
  const blocks = ((raw as DocNode).content ?? [])
    .slice(0, MAX_BLOCKS)
    .map((n) => cleanBlock(n, 1, ctx, "any"))
    .filter((x): x is DocNode => Boolean(x));
  // Empty paragraphs at the very end are only the cursor's resting place.
  while (blocks.length && blocks[blocks.length - 1].type === "paragraph" && !blocks[blocks.length - 1].content)
    blocks.pop();
  const doc: Doc = { type: "doc", content: blocks };
  return { doc: isEmptyDoc(doc) ? null : doc, dropped: ctx.dropped };
}

const VISIBLE = new Set(["image", "gallery", "video", "cta", "horizontalRule"]);

/** True when a document has no visible text and none of the blocks that show something by themselves. */
export function isEmptyDoc(doc: unknown): boolean {
  const walk = (n: DocNode | undefined): boolean => {
    if (!n || typeof n !== "object") return false;
    if (VISIBLE.has(n.type)) return true;
    if (typeof n.text === "string" && n.text.trim()) return true;
    return (n.content ?? []).some(walk);
  };
  return !walk(doc as DocNode);
}

/** Every photo a document uses (single images, gallery photos, button pictures), once each, in order. */
export function collectMediaIds(doc: unknown): string[] {
  const ids: string[] = [];
  const add = (v: unknown) => {
    if (isId(v) && !ids.includes(v)) ids.push(v);
  };
  const walk = (n: DocNode | undefined) => {
    if (!n || typeof n !== "object") return;
    const a = n.attrs ?? {};
    if (n.type === "image" || n.type === "cta") add(a.mediaId);
    if (n.type === "gallery" && Array.isArray(a.items)) for (const it of a.items) add((it as Json)?.mediaId);
    for (const c of n.content ?? []) walk(c);
  };
  walk(doc as DocNode);
  return ids;
}

/** The words of a document, for summaries and reading time. */
export function plainText(doc: unknown, max = 100_000): string {
  const parts: string[] = [];
  const walk = (n: DocNode | undefined) => {
    if (!n || typeof n !== "object") return;
    if (typeof n.text === "string") parts.push(n.text);
    for (const c of n.content ?? []) walk(c);
    if (n.content) parts.push(" ");
  };
  walk(doc as DocNode);
  return parts.join("").replace(/\s+/g, " ").trim().slice(0, max);
}

export const readingMinutes = (doc: unknown) =>
  Math.max(1, Math.round(plainText(doc).split(/\s+/).filter(Boolean).length / 220));
