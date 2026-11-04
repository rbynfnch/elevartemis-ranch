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

describe("RichText blog blocks", () => {
  const id = "00000000-0000-4000-8000-0000000000b1";
  const photos = { [id]: { src: "https://x/p.webp", srcSet: "", alt: "A mare", focalX: 0.5, focalY: 0.5 } };
  const render = (content: unknown[]) =>
    renderToStaticMarkup(<RichText doc={{ type: "doc", content }} photos={photos} />);

  it("shows headings H2 to H4, alignment, underline, dividers, small text and pull quotes", () => {
    const html = render([
      { type: "heading", attrs: { level: 4, textAlign: "center" }, content: [{ type: "text", text: "Small" }] },
      { type: "paragraph", content: [{ type: "text", text: "Under", marks: [{ type: "underline" }] }] },
      { type: "horizontalRule" },
      { type: "smallText", content: [{ type: "text", text: "Photo by us" }] },
      { type: "pullquote", content: [{ type: "text", text: "A great day." }] },
    ]);
    expect(html).toContain("<h4");
    expect(html).toContain("text-center");
    expect(html).toContain("<u>Under</u>");
    expect(html).toContain("<hr");
    expect(html).toContain("Photo by us");
    expect(html).toContain("A great day.");
  });
  it("shows an image in a chosen shape, floated, with caption and link", () => {
    const html = render([
      {
        type: "image",
        attrs: { mediaId: id, layout: "left", aspect: "16:9", zoom: 1.5, caption: "Her first day", href: "/horses/x" },
      },
    ]);
    expect(html).toContain("float-left");
    expect(html).toContain("aspect-ratio:16 / 9");
    expect(html).toContain("scale(1.50)");
    expect(html).toContain("Her first day");
    expect(html).toContain('href="/horses/x"');
  });
  it("shows a gallery, a privacy-friendly video, a callout and a button", () => {
    const html = render([
      { type: "gallery", attrs: { layout: "grid", items: [{ mediaId: id, caption: "One" }] } },
      { type: "video", attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ", caption: "Branding" } },
      {
        type: "callout",
        attrs: { tone: "tip" },
        content: [{ type: "paragraph", content: [{ type: "text", text: "Bring boots." }] }],
      },
      { type: "cta", attrs: { heading: "Meet Our Horses", label: "View Horses", href: "/horses" } },
    ]);
    expect(html).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(html).toContain("Bring boots.");
    expect(html).toContain("Meet Our Horses");
    expect(html).toContain('href="/horses"');
    expect(html).toContain("One");
  });
  it("never shows a block with an unsafe address or an unknown video", () => {
    const html = render([
      { type: "cta", attrs: { label: "Go", href: "javascript:alert(1)" } },
      { type: "video", attrs: { provider: "evil", videoId: "abc" } },
      { type: "image", attrs: { mediaId: id, href: "javascript:x" } },
    ]);
    expect(html).not.toContain("javascript");
    expect(html).not.toContain("<iframe");
  });
});
