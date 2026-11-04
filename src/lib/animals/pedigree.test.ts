import { describe, expect, it } from "vitest";
import { bracketPlace, buildPedigree, registrationText, toNodes, type PedigreeRow } from "./pedigree";

const row = (path: string, over: Partial<PedigreeRow> = {}): PedigreeRow =>
  ({
    path,
    generation: path.length,
    animal_id: `id-${path || "self"}`,
    name: `Horse ${path || "self"}`,
    registered_name: null,
    slug: `horse-${path || "self"}`,
    species: "horse",
    sex: path.endsWith("D") ? "female" : "male",
    breed: null,
    color: null,
    birth_year: null,
    record_scope: "inventory",
    is_linkable: true,
    notes: null,
    photo_variants: null,
    photo_focal_x: 0.5,
    photo_focal_y: 0.5,
    photo_alt: null,
    registry: null,
    registration_number: null,
    ...over,
  }) as PedigreeRow;

describe("registrationText", () => {
  it("combines registry and number, or shows just the number, or nothing", () => {
    expect(registrationText("AQHA", "2706274")).toBe("AQHA #2706274");
    expect(registrationText(null, "2706274")).toBe("#2706274");
    expect(registrationText("AQHA", null)).toBeNull();
    expect(registrationText("AQHA", "  ")).toBeNull();
  });
});

describe("toNodes", () => {
  it("links only ancestors that have a page, and marks outside ancestors", () => {
    const nodes = toNodes([
      row("S"),
      row("D", { is_linkable: false }),
      row("SS", { record_scope: "pedigree_only", is_linkable: false, registry: "AQHA", registration_number: "123" }),
    ]);
    expect(nodes.find((n) => n.path === "S")).toMatchObject({ owned: true, href: "/horses/horse-S" });
    expect(nodes.find((n) => n.path === "D")).toMatchObject({ owned: true, href: null });
    expect(nodes.find((n) => n.path === "SS")).toMatchObject({ owned: false, href: null, registration: "AQHA #123" });
  });
  it("uses the cattle address for cattle", () => {
    expect(toNodes([row("S", { species: "cattle" })])[0].href).toBe("/cattle/horse-S");
  });
});

describe("buildPedigree", () => {
  it("separates the animal from its ancestors and finds the depth", () => {
    const p = buildPedigree(toNodes([row(""), row("S"), row("D"), row("SS")]));
    expect(p.self?.path).toBe("");
    expect([...p.ancestors.keys()].sort()).toEqual(["D", "S", "SS"]);
    expect(p.depth).toBe(2);
  });
  it("has depth 0 with no ancestors", () => {
    expect(buildPedigree(toNodes([row("")])).depth).toBe(0);
  });
});

describe("bracketPlace", () => {
  it("puts each ancestor beside the rows it spans", () => {
    expect(bracketPlace("S", 2)).toEqual({ column: 2, rowStart: 1, rowSpan: 2 });
    expect(bracketPlace("D", 2)).toEqual({ column: 2, rowStart: 3, rowSpan: 2 });
    expect(bracketPlace("SS", 2)).toEqual({ column: 3, rowStart: 1, rowSpan: 1 });
    expect(bracketPlace("SD", 2)).toEqual({ column: 3, rowStart: 2, rowSpan: 1 });
    expect(bracketPlace("DS", 2)).toEqual({ column: 3, rowStart: 3, rowSpan: 1 });
    expect(bracketPlace("DD", 2)).toEqual({ column: 3, rowStart: 4, rowSpan: 1 });
  });
  it("scales with the depth", () => {
    expect(bracketPlace("DDD", 3)).toEqual({ column: 4, rowStart: 8, rowSpan: 1 });
    expect(bracketPlace("S", 3)).toEqual({ column: 2, rowStart: 1, rowSpan: 4 });
  });
});
