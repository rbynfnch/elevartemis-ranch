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

describe("RichText photos", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const doc = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Before" }] },
      { type: "image", attrs: { mediaId: id, caption: "Branding day", layout: "wide" } },
    ],
  };
  const photos = { [id]: { src: "https://x/a.webp", srcSet: "", alt: "A calf", focalX: 0.5, focalY: 0.5 } };
  it("shows a photo it was given, with its caption", () => {
    const html = renderToStaticMarkup(<RichText doc={doc} photos={photos} />);
    expect(html).toContain("<figure");
    expect(html).toContain('src="https://x/a.webp"');
    expect(html).toContain("<figcaption");
    expect(html).toContain("Branding day");
    expect(html).toContain('alt="A calf"');
  });
  it("skips a photo it wasn't given or that isn't a real id", () => {
    expect(renderToStaticMarkup(<RichText doc={doc} />)).not.toContain("<figure");
    const bad = { type: "doc", content: [{ type: "image", attrs: { mediaId: "../x" } }] };
    expect(renderToStaticMarkup(<RichText doc={bad} photos={photos} />)).toBe("<div></div>");
  });
});

describe("RichText photo fallback", () => {
  const id = "00000000-0000-4000-8000-000000000002";
  const withThumb = (thumb: string) => ({ type: "doc", content: [{ type: "image", attrs: { mediaId: id, thumb } }] });
  it("uses the saved preview when the photo can't be looked up, only if it is in the site's own storage", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "k".repeat(30);
    const own = "https://abc.supabase.co/storage/v1/object/public/ranch-media/r/p/480.webp";
    expect(renderToStaticMarkup(<RichText doc={withThumb(own)} />)).toContain(`src="${own}"`);
    expect(renderToStaticMarkup(<RichText doc={withThumb("https://evil.example/x.webp")} />)).not.toContain("<figure");
  });
});
