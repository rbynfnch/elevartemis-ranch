import { describe, expect, it } from "vitest";
import { compactFacts, isBlank, joinPresent, richTextIsEmpty } from "./empty";

const doc = (...paragraphs: string[]) => ({
  type: "doc",
  content: paragraphs.map((text) => ({ type: "paragraph", content: text ? [{ type: "text", text }] : undefined })),
});

describe("isBlank", () => {
  it("treats null, whitespace and empty arrays as blank", () => {
    for (const v of [null, undefined, "", "   ", []]) expect(isBlank(v)).toBe(true);
    for (const v of ["x", 0, false, ["a"]]) expect(isBlank(v)).toBe(false);
  });
});

describe("richTextIsEmpty", () => {
  it("matches the database rule", () => {
    expect(richTextIsEmpty(null)).toBe(true);
    expect(richTextIsEmpty(doc(""))).toBe(true);
    expect(richTextIsEmpty(doc("   "))).toBe(true);
    expect(richTextIsEmpty(doc("", "Hello"))).toBe(false);
    expect(richTextIsEmpty({ type: "doc", content: [{ type: "image", attrs: { src: "x" } }] })).toBe(false);
  });
});

describe("compactFacts", () => {
  it("drops facts with no value, keeps zero", () => {
    expect(
      compactFacts([
        { label: "Registration number", value: null },
        { label: "Color", value: "  Bay " },
        { label: "Height", value: "" },
        { label: "Wins", value: 0 },
      ]),
    ).toEqual([
      { label: "Color", value: "Bay" },
      { label: "Wins", value: "0" },
    ]);
  });
});

describe("joinPresent", () => {
  it("joins only present parts", () => {
    expect(joinPresent(["Mare", null, "Quarter Horse", "", 2019])).toBe("Mare, Quarter Horse, 2019");
    expect(joinPresent([null, " "])).toBeNull();
  });
});
