import { describe, expect, it } from "vitest";
import {
  contrastProblems,
  contrastRatio,
  defaultPalette,
  paletteStyle,
  parsePaletteOverride,
  resolveFontPreset,
  resolvePalette,
} from "./tokens";

describe("default palette", () => {
  it("meets WCAG AA for every required text pair", () => {
    expect(contrastProblems(defaultPalette)).toEqual([]);
  });
});

describe("contrastRatio", () => {
  it("matches known values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe("palette overrides", () => {
  it("drops invalid entries instead of breaking the site", () => {
    expect(parsePaletteOverride({ primary: "#3B4F2E", ink: "red", bogus: "#000000" })).toEqual({ primary: "#3B4F2E" });
    expect(parsePaletteOverride(null)).toEqual({});
  });
  it("picks a readable on-primary colour for a light primary", () => {
    const palette = resolvePalette({ primary: "#E8D9A8" });
    expect(contrastRatio(palette.onPrimary, palette.primary)).toBeGreaterThanOrEqual(4.5);
  });
  it("emits only changed tokens as CSS variables", () => {
    expect(paletteStyle(defaultPalette)).toEqual({});
    expect(paletteStyle(resolvePalette({ accent: "#8A5A2B" }))).toEqual({ "--c-accent": "#8A5A2B" });
  });
});

describe("font presets", () => {
  it("falls back to heritage for unknown presets", () => {
    expect(resolveFontPreset("prairie")).toBe("prairie");
    expect(resolveFontPreset("comic-sans")).toBe("heritage");
    expect(resolveFontPreset(null)).toBe("heritage");
  });
});
