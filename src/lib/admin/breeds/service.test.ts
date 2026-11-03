import { describe, expect, it } from "vitest";
import { breedSuggestions, cleanBreedName, starterBreeds, type BreedItem } from "./service";

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

describe("breedSuggestions", () => {
  const breed = (name: string, hidden = false): BreedItem => ({
    id: name,
    species: "cattle",
    name,
    animals: 0,
    hidden,
  });

  it("offers removed breeds first, then common ones that aren't known yet", () => {
    const result = breedSuggestions(
      [breed("Hereford"), breed("Copper Cross", true)],
      ["Hereford", "Angus", "Charolais"],
    );
    expect(result).toEqual([
      { name: "Copper Cross", restoreId: "Copper Cross" },
      { name: "Angus", restoreId: null },
      { name: "Charolais", restoreId: null },
    ]);
  });
  it("never suggests a breed that is already listed, whatever its capitals", () => {
    expect(breedSuggestions([breed("hereford")], ["Hereford"])).toEqual([]);
  });
  it("does not offer a common breed twice when it was removed", () => {
    const result = breedSuggestions([breed("Angus", true)], ["Angus"]);
    expect(result).toEqual([{ name: "Angus", restoreId: "Angus" }]);
  });
});
