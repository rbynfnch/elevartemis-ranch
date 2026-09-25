import type { ReactNode } from "react";
import { richTextIsEmpty } from "./empty";

/**
 * Renders stored Tiptap JSON to React through an allowlist. Unknown node
 * types render only their children; unknown marks are ignored; link hrefs are
 * restricted to http(s), mailto, tel and site-relative paths. No HTML string
 * is ever injected, so stored content cannot run script.
 */
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

function renderNodes(nodes: Node[] | undefined): ReactNode[] {
  return (nodes ?? []).map((node, i) => renderNode(node, i));
}

function renderNode(node: Node, key: number): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return richTextIsEmpty(node) ? null : <p key={key}>{renderNodes(node.content)}</p>;
    case "heading": {
      if (richTextIsEmpty(node)) return null;
      return node.attrs?.level === 3 ? (
        <h3 key={key}>{renderNodes(node.content)}</h3>
      ) : (
        <h2 key={key}>{renderNodes(node.content)}</h2>
      );
    }
    case "bulletList":
      return <ul key={key}>{renderNodes(node.content)}</ul>;
    case "orderedList":
      return <ol key={key}>{renderNodes(node.content)}</ol>;
    case "listItem":
      return <li key={key}>{renderNodes(node.content)}</li>;
    case "blockquote":
      return <blockquote key={key}>{renderNodes(node.content)}</blockquote>;
    case "hardBreak":
      return <br key={key} />;
    default:
      return <span key={key}>{renderNodes(node.content)}</span>;
  }
}

/** Renders nothing at all for empty documents, so callers can drop headings too. */
export function RichText({ doc, className }: { doc: unknown; className?: string }) {
  if (richTextIsEmpty(doc)) return null;
  const root = doc as Node;
  return <div className={className}>{renderNodes(root.content)}</div>;
}
