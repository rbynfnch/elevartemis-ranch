import { describe, expect, it } from "vitest";
import { metaHint, slugify, tidyPost, type PostInput } from "./fields";

const base: PostInput = {
  title: "  Branding   Day ",
  slug: "",
  excerpt: "",
  body: null,
  featuredMediaId: null,
  categoryId: null,
  status: "draft",
  publishedOn: "",
  metaTitle: "",
  metaDescription: "",
  focusPhrase: "",
  extraMediaIds: [],
  animalIds: [],
};

describe("slugify", () => {
  it("makes a plain web address", () => {
    expect(slugify("Branding Day, 2026!")).toBe("branding-day-2026");
    expect(slugify("Cows & Calves")).toBe("cows-and-calves");
    expect(slugify("Café déjà vu")).toBe("cafe-deja-vu");
    expect(slugify("  --  ")).toBe("");
  });
});

describe("tidyPost", () => {
  it("collapses spaces and takes the web address from the title", () => {
    const r = tidyPost(base);
    expect(r.ok && r.post.title).toBe("Branding Day");
    expect(r.ok && r.post.slug).toBe("branding-day");
  });
  it("needs a title and a valid date", () => {
    expect(tidyPost({ ...base, title: "  " }).ok).toBe(false);
    expect(tidyPost({ ...base, publishedOn: "13/45/2020" }).ok).toBe(false);
    expect(tidyPost({ ...base, publishedOn: "1800-01-01" }).ok).toBe(false);
  });
  it("can be backdated", () => {
    const r = tidyPost({ ...base, publishedOn: "2019-05-04" });
    expect(r.ok && r.post.published_at).toBe("2019-05-04T12:00:00Z");
  });
  it("turns empty text into null and cuts long text", () => {
    const r = tidyPost({ ...base, excerpt: "x".repeat(400), metaTitle: " " });
    expect(r.ok && r.post.excerpt).toHaveLength(300);
    expect(r.ok && r.post.meta_title).toBeNull();
  });
});

describe("metaHint", () => {
  it("guides the length", () => {
    expect(metaHint("title", "x".repeat(70))).toMatch(/cut it off/);
    expect(metaHint("description", "short")).toMatch(/little short/);
    expect(metaHint("description", "x".repeat(120))).toMatch(/Good/);
  });
});
