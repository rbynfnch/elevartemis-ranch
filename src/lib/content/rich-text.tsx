import type { ReactNode } from "react";
import { richTextIsEmpty } from "./empty";
import { CtaBlock, Callout, GalleryBlock, ImageBlock, VideoBlock } from "@/components/blog/blocks";

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
    else if (mark.type === "underline") out = <u key={key}>{out}</u>;
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

function alignClass(a: unknown): string | undefined {
  return a === "center" ? "text-center" : a === "right" ? "text-right" : undefined;
}

function renderNodes(nodes: Node[] | undefined, photos?: TextPhotos): ReactNode[] {
  return (nodes ?? []).map((node, i) => renderNode(node, i, photos));
}

function renderNode(node: Node, key: number, photos?: TextPhotos): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return richTextIsEmpty(node) ? null : (
        <p key={key} className={alignClass(node.attrs?.textAlign)}>
          {renderNodes(node.content, photos)}
        </p>
      );
    case "heading": {
      if (richTextIsEmpty(node)) return null;
      const level = node.attrs?.level === 4 ? 4 : node.attrs?.level === 3 ? 3 : 2;
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      return (
        <Tag key={key} className={alignClass(node.attrs?.textAlign)}>
          {renderNodes(node.content, photos)}
        </Tag>
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
    case "image":
      return <ImageBlock key={key} attrs={node.attrs ?? {}} photos={photos} />;
    case "gallery":
      return <GalleryBlock key={key} attrs={node.attrs ?? {}} photos={photos} />;
    case "video":
      return <VideoBlock key={key} attrs={node.attrs ?? {}} />;
    case "cta":
      return <CtaBlock key={key} attrs={node.attrs ?? {}} photos={photos} />;
    case "callout":
      return (
        <Callout key={key} tone={node.attrs?.tone}>
          {renderNodes(node.content, photos)}
        </Callout>
      );
    case "pullquote":
      return richTextIsEmpty(node) ? null : (
        <blockquote
          key={key}
          className="my-10 border-l-4 border-accent pl-6 font-serif text-2xl italic leading-snug text-ink"
        >
          {renderNodes(node.content, photos)}
        </blockquote>
      );
    case "smallText":
      return richTextIsEmpty(node) ? null : (
        <p key={key} className="text-sm text-ink-muted">
          {renderNodes(node.content, photos)}
        </p>
      );
    case "horizontalRule":
      return <hr key={key} className="my-10 border-rule" />;
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
