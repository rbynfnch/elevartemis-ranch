import { describe, expect, it } from "vitest";
import { fullPalette, palettePresets, presetById, presetForOverride } from "./presets";
import { contrastProblems, parsePaletteOverride } from "./tokens";

describe("palette presets", () => {
  it.each(palettePresets.map((p) => [p.id, p] as const))("%s meets the contrast rules", (_id, preset) => {
    expect(contrastProblems(fullPalette(preset))).toEqual([]);
  });
  it("every stored value is a valid color the site will accept", () => {
    for (const p of palettePresets) expect(parsePaletteOverride(p.override)).toEqual(p.override);
  });
  it("finds a preset by id, and by what is stored", () => {
    expect(presetById("big-sky")?.label).toBe("Big Sky");
    expect(presetById("nope")).toBeNull();
    expect(presetForOverride({})?.id).toBe("high-plains");
    expect(presetForOverride(presetById("red-rock")!.override)?.id).toBe("red-rock");
    expect(presetForOverride({ primary: "#123456" })).toBeNull();
  });
  it("has unique ids", () => {
    expect(new Set(palettePresets.map((p) => p.id)).size).toBe(palettePresets.length);
  });
});
