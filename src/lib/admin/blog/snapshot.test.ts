import { describe, expect, it } from "vitest";
import { emptySnapshot, parseSnapshot, sameSnapshot, snapshotFromInput, type PostInput } from "./snapshot";

const A = "00000000-0000-4000-8000-000000000001";
const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }] };
const input = (over: Partial<PostInput> = {}): PostInput => ({
  title: "  Branding   Day ",
  slug: "",
  excerpt: "",
  body: doc,
  featuredMediaId: null,
  categoryId: null,
  tagIds: [],
  authorName: "",
  showAuthor: false,
  publishedLocal: "",
  metaTitle: "",
  metaDescription: "",
  ogTitle: "",
  ogDescription: "",
  ogMediaId: null,
  relatedIds: [],
  animalIds: [],
  ...over,
});

describe("snapshotFromInput", () => {
  it("tidies a post and takes the address from the title", () => {
    const r = snapshotFromInput(input(), "America/Denver");
    expect(r.ok && r.snapshot.title).toBe("Branding Day");
    expect(r.ok && r.snapshot.slug).toBe("branding-day");
  });
  it("lets a draft be unfinished, but not a published post", () => {
    expect(snapshotFromInput(input({ title: "", body: null }), "America/Denver").ok).toBe(true);
    expect(snapshotFromInput(input({ title: "" }), "America/Denver", { forPublish: true })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/title/),
    });
    expect(snapshotFromInput(input({ body: null }), "America/Denver", { forPublish: true })).toMatchObject({
      ok: false,
      message: expect.stringMatching(/story/),
    });
  });
  it("reads the date in the ranch's own time zone", () => {
    const r = snapshotFromInput(input({ publishedLocal: "2026-12-01T09:30" }), "America/Denver");
    expect(r.ok && r.snapshot.publishedAt).toBe("2026-12-01T16:30:00.000Z");
    expect(snapshotFromInput(input({ publishedLocal: "nope" }), "America/Denver").ok).toBe(false);
    expect(snapshotFromInput(input({ publishedLocal: "1800-01-01T00:00" }), "America/Denver").ok).toBe(false);
  });
  it("refuses a reserved address and drops what isn't a real id", () => {
    expect(snapshotFromInput(input({ slug: "preview" }), "America/Denver").ok).toBe(false);
    const r = snapshotFromInput(
      input({ tagIds: [A, "nope", A], relatedIds: ["x"], featuredMediaId: "../x" }),
      "America/Denver",
    );
    expect(r.ok && r.snapshot.tagIds).toEqual([A]);
    expect(r.ok && r.snapshot.relatedIds).toEqual([]);
    expect(r.ok && r.snapshot.featuredMediaId).toBeNull();
  });
  it("cleans the story as it saves it", () => {
    const r = snapshotFromInput(
      input({ body: { type: "doc", content: [{ type: "script" }, ...doc.content] } }),
      "America/Denver",
    );
    expect(r.ok && r.dropped).toBe(1);
  });
});

describe("snapshots", () => {
  it("compares and reads back what was stored", () => {
    const a = emptySnapshot();
    expect(sameSnapshot(a, { ...a })).toBe(true);
    expect(sameSnapshot(a, { ...a, title: "x" })).toBe(false);
    expect(parseSnapshot(null)).toEqual(emptySnapshot());
    expect(
      parseSnapshot({
        title: "T",
        tagIds: [A, 5],
        publishedAt: "bad",
        body: { type: "doc", content: [{ type: "iframe" }] },
      }),
    ).toMatchObject({ title: "T", tagIds: [A], publishedAt: null, body: null });
  });
});
