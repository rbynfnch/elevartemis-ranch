import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText, safeHref } from "./rich-text";

describe("safeHref", () => {
  it("allows safe schemes and relative paths only", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("/horses/juniper-blue")).toBe("/horses/juniper-blue");
    expect(safeHref("mailto:a@b.co")).toBe("mailto:a@b.co");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref(42)).toBeNull();
  });
});

describe("RichText", () => {
  it("renders nothing for an empty document", () => {
    expect(renderToStaticMarkup(<RichText doc={{ type: "doc", content: [{ type: "paragraph" }] }} />)).toBe("");
  });
  it("renders allowed marks and strips unsafe links", () => {
    const html = renderToStaticMarkup(
      <RichText
        doc={{
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Bold", marks: [{ type: "bold" }] }] },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Bad", marks: [{ type: "link", attrs: { href: "javascript:x" } }] }],
            },
            { type: "paragraph" },
          ],
        }}
      />,
    );
    expect(html).toBe("<div><p><strong>Bold</strong></p><p>Bad</p></div>");
  });
  it("escapes text content", () => {
    const html = renderToStaticMarkup(
      <RichText
        doc={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>x</script>" }] }] }}
      />,
    );
    expect(html).not.toContain("<script>");
  });
});
