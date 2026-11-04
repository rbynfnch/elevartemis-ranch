import { describe, expect, it } from "vitest";
import { collectMediaIds, isEmptyDoc, plainText, readingMinutes, safeLink, sanitizeDoc } from "./content";

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

describe("safeLink", () => {
  it("allows pages, https/http, mail and phone only", () => {
    for (const ok of ["/horses/x", "https://a.com/b", "http://a.com", "mailto:a@b.co", "tel:+15551234"])
      expect(safeLink(ok)).toBe(ok);
    for (const bad of [
      "javascript:alert(1)",
      "//evil.com",
      "data:text/html,x",
      "/a b",
      "",
      "\\\\x",
      " vbscript:x",
      "ftp://x",
    ])
      expect(safeLink(bad)).toBeNull();
  });
});

describe("sanitizeDoc", () => {
  it("keeps ordinary writing exactly", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
        p("Hello"),
        { type: "bulletList", content: [{ type: "listItem", content: [p("one")] }] },
      ],
    };
    expect(sanitizeDoc(doc).doc).toEqual(doc);
  });
  it("drops unknown blocks, scripts and unsafe links", () => {
    const hostile = {
      type: "doc",
      content: [
        { type: "script", content: [{ type: "text", text: "alert(1)" }] },
        { type: "iframe", attrs: { src: "https://evil" } },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Click", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Safe",
              marks: [{ type: "link", attrs: { href: "https://ok.com" } }, { type: "style" }],
            },
          ],
        },
      ],
    };
    const { doc, dropped } = sanitizeDoc(hostile);
    expect(dropped).toBe(2);
    expect(JSON.stringify(doc)).not.toContain("javascript");
    expect(doc?.content[1].content?.[0].marks).toEqual([{ type: "link", attrs: { href: "https://ok.com" } }]);
  });
  it("clamps headings to H2-H4 and never keeps an H1", () => {
    const { doc } = sanitizeDoc({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Big" }] },
        { type: "heading", attrs: { level: 9 }, content: [{ type: "text", text: "Bigger" }] },
      ],
    });
    expect(doc?.content.map((h) => (h.attrs as { level: number }).level)).toEqual([2, 4]);
  });
  it("keeps real photos only, with limits", () => {
    const { doc } = sanitizeDoc({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            mediaId: A,
            thumb: "https://x/t.webp",
            layout: "left",
            aspect: "16:9",
            zoom: 99,
            focalX: -4,
            href: "javascript:x",
          },
        },
        { type: "image", attrs: { mediaId: "../../etc/passwd" } },
        {
          type: "gallery",
          attrs: { layout: "slideshow", items: [{ mediaId: A }, { mediaId: "nope" }, { mediaId: B, caption: "Two" }] },
        },
        { type: "gallery", attrs: { items: [] } },
      ],
    });
    expect(doc?.content).toHaveLength(2);
    expect(doc?.content[0].attrs).toMatchObject({ layout: "left", aspect: "16:9", zoom: 3, focalX: 0, href: null });
    expect((doc?.content[1].attrs?.items as unknown[]).length).toBe(2);
    expect(collectMediaIds(doc)).toEqual([A, B]);
  });
  it("accepts video by provider and id only, and a button only with a label and a safe address", () => {
    const { doc } = sanitizeDoc({
      type: "doc",
      content: [
        { type: "video", attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ" } },
        { type: "video", attrs: { provider: "evil", videoId: "x" } },
        { type: "video", attrs: { provider: "vimeo", videoId: "<script>" } },
        { type: "cta", attrs: { label: "View Horses", href: "/horses", heading: "Meet Our Horses" } },
        { type: "cta", attrs: { label: "Go", href: "javascript:x" } },
        { type: "cta", attrs: { label: "", href: "/x" } },
      ],
    });
    expect(doc?.content.map((n) => n.type)).toEqual(["video", "cta"]);
  });
  it("is null for nothing, rubbish and empty paragraphs", () => {
    expect(sanitizeDoc(null).doc).toBeNull();
    expect(sanitizeDoc("x").doc).toBeNull();
    expect(sanitizeDoc({ type: "doc", content: [{ type: "paragraph" }] }).doc).toBeNull();
  });
  it("copes with a very deep or very long document", () => {
    let deep: unknown = p("x");
    for (let i = 0; i < 20; i++) deep = { type: "blockquote", content: [deep] };
    expect(() => sanitizeDoc({ type: "doc", content: [deep] })).not.toThrow();
    const many = { type: "doc", content: Array.from({ length: 1000 }, (_, i) => p(`p${i}`)) };
    expect(sanitizeDoc(many).doc?.content).toHaveLength(400);
  });
});

describe("helpers", () => {
  it("knows when a document shows nothing", () => {
    expect(isEmptyDoc({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
    expect(isEmptyDoc({ type: "doc", content: [{ type: "video", attrs: {} }] })).toBe(false);
  });
  it("reads the words and estimates reading time", () => {
    expect(plainText({ type: "doc", content: [p("Hello there"), p("world")] })).toBe("Hello there world");
    expect(readingMinutes({ type: "doc", content: [p("word ".repeat(660))] })).toBe(3);
    expect(readingMinutes(null)).toBe(1);
  });
});
