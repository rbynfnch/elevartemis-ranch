import { Node, mergeAttributes } from "@tiptap/react";

/**
 * A photo from the Photo Library placed inside the text. It is stored as an `image` node that names the photo by
 * id (plus a small preview address used only while editing); the website looks the photo up by id, so a
 * pasted address can never put anything else on the page.
 */
export const PhotoNode = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      mediaId: { default: null, parseHTML: (el) => el.getAttribute("data-photo-id") },
      thumb: {
        default: null,
        rendered: false,
        parseHTML: (el) => {
          const src = el.querySelector("img")?.getAttribute("src") ?? "";
          return /^https:\/\//i.test(src) ? src : null;
        },
      },
      alt: { default: "", rendered: false, parseHTML: (el) => el.querySelector("img")?.getAttribute("alt") ?? "" },
      caption: { default: "", rendered: false, parseHTML: (el) => el.querySelector("figcaption")?.textContent ?? "" },
      layout: {
        default: "normal",
        parseHTML: (el) => (el.getAttribute("data-layout") === "wide" ? "wide" : "normal"),
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-photo-id]" }];
  },

  renderHTML({ node }) {
    const { mediaId, thumb, alt, caption, layout } = node.attrs as Record<string, string | null>;
    return [
      "figure",
      mergeAttributes({
        "data-photo-id": mediaId ?? "",
        "data-layout": layout === "wide" ? "wide" : "normal",
        class: "my-4",
      }),
      ["img", { src: thumb ?? "", alt: alt ?? "", class: "h-auto max-h-80 w-auto max-w-full" }],
      ...(caption ? [["figcaption", { class: "text-sm italic" }, caption]] : []),
    ] as never;
  },
});
