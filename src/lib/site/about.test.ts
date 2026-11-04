import { describe, expect, it } from "vitest";
import { textToDoc } from "@/lib/admin/form-values";
import { aboutIsEmpty, aboutSchema, emptyAbout, parseAbout, safeButtonHref, toSections } from "./about";

describe("parseAbout", () => {
  it("is empty for nothing, or for rubbish", () => {
    expect(aboutIsEmpty(parseAbout(null))).toBe(true);
    expect(aboutIsEmpty(parseAbout([{ kind: "intro", heading: 5 }]))).toBe(true);
    expect(parseAbout("nope")).toEqual(emptyAbout);
  });
  it("reads what toSections wrote", () => {
    const content = aboutSchema.parse({
      intro: { heading: "Who we are", body: textToDoc("A paragraph."), showMark: true },
      highlights: [
        { icon: "tree", title: "Land", text: "Cared for." },
        { icon: null, title: "", text: "" },
      ],
      story: { heading: "Our story", buttonLabel: "Get in touch", buttonHref: "/contact" },
      valuesHeading: "What we value",
      values: [{ icon: "heart", title: "Family", text: "" }],
      bandMediaId: "00000000-0000-4000-8000-000000000001",
    });
    const sections = toSections(content);
    expect(sections.map((s) => s.kind)).toEqual(["intro", "highlights", "story", "values", "photo_band"]);
    const back = parseAbout(sections);
    expect(back.highlights).toHaveLength(1);
    expect(back.intro.heading).toBe("Who we are");
    expect(back.values[0].title).toBe("Family");
    expect(back.bandMediaId).toBe("00000000-0000-4000-8000-000000000001");
  });
  it("saves nothing for parts left empty", () => {
    expect(toSections(emptyAbout)).toEqual([]);
  });
  it("allows at most three highlights and four values", () => {
    const four = Array.from({ length: 4 }, () => ({ icon: null, title: "t", text: "" }));
    expect(parseAbout([{ kind: "highlights", items: four }]).highlights).toEqual([]);
    expect(aboutSchema.safeParse({ values: [...four, ...four] }).success).toBe(false);
  });
});

describe("safeButtonHref", () => {
  it("accepts a path on the site or an https address, nothing else", () => {
    expect(safeButtonHref("/contact")).toBe("/contact");
    expect(safeButtonHref("https://example.com/x")).toBe("https://example.com/x");
    for (const bad of ["", "javascript:alert(1)", "//evil.com", "http://example.com", "/a b", "contact"])
      expect(safeButtonHref(bad)).toBeNull();
  });
});
