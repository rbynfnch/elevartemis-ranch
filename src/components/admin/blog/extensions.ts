import { Extension, Node, mergeAttributes, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import type { ComponentType } from "react";

type View = ComponentType<ReactNodeViewProps>;

/**
 * The blocks the blog editor understands. They match what `sanitizeDoc` keeps and what the public site draws
 * (lib/blog/content.ts), so nothing can be written here that the site would not show.
 */

/** Centered and right-aligned text on paragraphs and headings. */
export const TextAlign = Extension.create({
  name: "textAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          textAlign: {
            default: "left",
            parseHTML: (el) => {
              const a = (el as HTMLElement).style.textAlign;
              return a === "center" || a === "right" ? a : "left";
            },
            renderHTML: (attrs) =>
              attrs.textAlign === "center" || attrs.textAlign === "right"
                ? { style: `text-align:${attrs.textAlign}` }
                : {},
          },
        },
      },
    ];
  },
});

export const SmallText = Node.create({
  name: "smallText",
  group: "block",
  content: "inline*",
  parseHTML: () => [{ tag: "p[data-small]" }],
  renderHTML: ({ HTMLAttributes }) => ["p", mergeAttributes(HTMLAttributes, { "data-small": "true" }), 0],
});

export const Pullquote = Node.create({
  name: "pullquote",
  group: "block",
  content: "inline*",
  defining: true,
  parseHTML: () => [{ tag: "blockquote[data-pullquote]", priority: 100 }],
  renderHTML: ({ HTMLAttributes }) => ["blockquote", mergeAttributes(HTMLAttributes, { "data-pullquote": "true" }), 0],
});

export const Callout = (view: View) =>
  Node.create({
    name: "callout",
    group: "block",
    content: "(paragraph | bulletList | orderedList)+",
    defining: true,
    addAttributes() {
      return {
        tone: {
          default: "info",
          parseHTML: (el) => el.getAttribute("data-tone") ?? "info",
          renderHTML: (a) => ({ "data-tone": a.tone }),
        },
      };
    },
    parseHTML: () => [{ tag: "div[data-callout]" }],
    renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-callout": "true" }), 0],
    addNodeView: () => ReactNodeViewRenderer(view),
  });

/**
 * A block that is one unit (a photo, gallery, video or button). In the HTML view it is a single tag carrying its
 * settings, which is read back safely: whatever is typed there is checked again before anything is saved.
 */
export function atomBlock(name: string, defaults: Record<string, unknown>, view: View) {
  return Node.create({
    name,
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    addAttributes() {
      return Object.fromEntries(
        Object.entries(defaults).map(([key, value]) => [
          key,
          {
            default: value,
            rendered: false,
            parseHTML: (el: HTMLElement) => {
              try {
                const all = JSON.parse(el.getAttribute("data-attrs") ?? "{}") as Record<string, unknown>;
                return all[key] ?? value;
              } catch {
                return value;
              }
            },
          },
        ]),
      );
    },
    parseHTML: () => [{ tag: `div[data-block="${name}"]` }],
    renderHTML: ({ node }) => ["div", { "data-block": name, "data-attrs": JSON.stringify(node.attrs) }],
    addNodeView: () => ReactNodeViewRenderer(view),
  });
}

export const IMAGE_DEFAULTS = {
  mediaId: null,
  thumb: null,
  alt: "",
  caption: "",
  layout: "normal",
  aspect: "original",
  zoom: 1,
  focalX: 0.5,
  focalY: 0.5,
  href: null,
};
export const GALLERY_DEFAULTS = { layout: "grid", columns: 3, aspect: "original", items: [] };
export const VIDEO_DEFAULTS = { provider: "youtube", videoId: "", url: null, caption: "" };
export const CTA_DEFAULTS = { heading: "", text: "", label: "", href: "", mediaId: null, thumb: null };
