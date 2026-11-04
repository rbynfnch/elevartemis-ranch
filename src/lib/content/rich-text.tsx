import type { ReactNode } from "react";
import { richTextIsEmpty } from "./empty";
import { isPhotoId } from "./photos";

/**
 * Renders stored Tiptap JSON to React through an allowlist. Unknown node
 * types render only their children; unknown marks are ignored; link hrefs are
 * restricted to http(s), mailto, tel and site-relative paths. No HTML string
 * is ever injected, so stored content cannot run script.
 */
/** A photo placed in the text, already looked up by the page (the text itself only names it by id). */
export type TextPhoto = { src: string; srcSet: string; alt: string; focalX: number; focalY: number };
export type TextPhotos = Record<string, TextPhoto | null | undefined>;

type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = { type?: string; text?: string; marks?: Mark[]; attrs?: Record<string, unknown>; content?: Node[] };

export function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const href = raw.trim();
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("#")) return href;
  return null;
}

function renderText(node: Node, key: number): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") out = <strong key={key}>{out}</strong>;
    else if (mark.type === "italic") out = <em key={key}>{out}</em>;
    else if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      if (href) {
        const external = /^https?:/i.test(href);
        out = (
          <a key={key} href={href} {...(external ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
            {out}
          </a>
        );
      }
    }
  }
  return out;
}

function renderNodes(nodes: Node[] | undefined, photos?: TextPhotos): ReactNode[] {
  return (nodes ?? []).map((node, i) => renderNode(node, i, photos));
}

function renderNode(node: Node, key: number, photos?: TextPhotos): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return richTextIsEmpty(node) ? null : <p key={key}>{renderNodes(node.content, photos)}</p>;
    case "heading": {
      if (richTextIsEmpty(node)) return null;
      return node.attrs?.level === 3 ? (
        <h3 key={key}>{renderNodes(node.content, photos)}</h3>
      ) : (
        <h2 key={key}>{renderNodes(node.content, photos)}</h2>
      );
    }
    case "bulletList":
      return <ul key={key}>{renderNodes(node.content, photos)}</ul>;
    case "orderedList":
      return <ol key={key}>{renderNodes(node.content, photos)}</ol>;
    case "listItem":
      return <li key={key}>{renderNodes(node.content, photos)}</li>;
    case "blockquote":
      return <blockquote key={key}>{renderNodes(node.content, photos)}</blockquote>;
    case "hardBreak":
      return <br key={key} />;
    case "image": {
      // Only a real photo of this ranch that the page looked up is shown; anything else is skipped.
      const id = node.attrs?.mediaId;
      const photo = isPhotoId(id) ? photos?.[id] : null;
      if (!photo) return null;
      const caption = typeof node.attrs?.caption === "string" ? node.attrs.caption.trim() : "";
      const alt = typeof node.attrs?.alt === "string" && node.attrs.alt.trim() ? node.attrs.alt.trim() : photo.alt;
      const wide = node.attrs?.layout === "wide";
      return (
        <figure key={key} className={wide ? "my-10 lg:-mx-12" : "my-8"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.src}
            srcSet={photo.srcSet || undefined}
            sizes={wide ? "(min-width: 1024px) 60rem, 100vw" : "(min-width: 768px) 44rem, 100vw"}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="h-auto w-full"
          />
          {caption ? <figcaption className="mt-2 text-sm italic text-ink-muted">{caption}</figcaption> : null}
        </figure>
      );
    }
    default:
      return <span key={key}>{renderNodes(node.content, photos)}</span>;
  }
}

/** Renders nothing at all for empty documents, so callers can drop headings too. */
export function RichText({ doc, className, photos }: { doc: unknown; className?: string; photos?: TextPhotos }) {
  if (richTextIsEmpty(doc)) return null;
  const root = doc as Node;
  return <div className={className}>{renderNodes(root.content, photos)}</div>;
}
