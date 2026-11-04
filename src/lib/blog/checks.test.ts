import { describe, expect, it } from "vitest";
import { photosWithoutDescription, publishChecks } from "./checks";

const doc = (content: unknown[]) => ({ type: "doc", content });
const text = { type: "paragraph", content: [{ type: "text", text: "Hello" }] };

describe("publishChecks", () => {
  it("requires a title and a story", () => {
    const c = publishChecks({ title: "", body: null, excerpt: "", featuredMediaId: null, categoryId: null, metaDescription: "" });
    expect(c.filter((x) => x.level === "required")).toHaveLength(2);
  });
  it("only suggests the rest", () => {
    const c = publishChecks({ title: "Foals", body: doc([text]), excerpt: "", featuredMediaId: null, categoryId: null, metaDescription: "" });
    expect(c.every((x) => x.level === "suggest")).toBe(true);
    expect(c.length).toBeGreaterThan(2);
  });
  it("is quiet when all is filled in", () => {
    const c = publishChecks({ title: "Foals", body: doc([text]), excerpt: "s", featuredMediaId: "x", categoryId: "y", metaDescription: "d" });
    expect(c).toEqual([]);
  });
});

describe("photosWithoutDescription", () => {
  it("counts single photos and gallery photos with no description", () => {
    const d = doc([
      { type: "image", attrs: { mediaId: "a", alt: "" } },
      { type: "image", attrs: { mediaId: "b", alt: "A bay colt" } },
      { type: "gallery", attrs: { items: [{ alt: "" }, { alt: "ok" }] } },
    ]);
    expect(photosWithoutDescription(d)).toBe(2);
  });
});
