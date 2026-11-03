import { describe, expect, it } from "vitest";
import { cleanBreedName, starterBreeds } from "./service";

describe("cleanBreedName", () => {
  it("trims and collapses spaces", () => {
    expect(cleanBreedName("  Red   Angus ")).toEqual({ ok: true, name: "Red Angus" });
  });
  it("rejects empty and over-long names", () => {
    expect(cleanBreedName("   ").ok).toBe(false);
    expect(cleanBreedName("a".repeat(81)).ok).toBe(false);
    expect(cleanBreedName("a".repeat(80)).ok).toBe(true);
  });
});

describe("starterBreeds", () => {
  it("offers a few common breeds per species, with no duplicates", () => {
    for (const list of Object.values(starterBreeds)) {
      expect(list.length).toBeGreaterThan(3);
      expect(new Set(list.map((b) => b.toLowerCase())).size).toBe(list.length);
    }
  });
});
