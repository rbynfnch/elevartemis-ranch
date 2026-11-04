import { describe, expect, it } from "vitest";
import type { ListingCard } from "./cards";
import { activeFilterCount, applyFilters, buildFacets, noFilters, sortCards } from "./for-sale-filter";

const card = (name: string, over: Partial<ListingCard> = {}): ListingCard => ({
  name,
  href: `/horses/${name}`,
  categoryLabel: "Mare",
  species: "horse",
  categoryId: "horse.mare",
  groupsByBirthYear: false,
  displayOrder: 0,
  sex: "female",
  color: null,
  height: null,
  tagline: null,
  registry: null,
  registrationNumber: null,
  priceCents: null,
  featured: false,
  earTag: null,
  weightLb: null,
  headCount: null,
  breed: null,
  birthYear: null,
  ...over,
});

const herd = [
  card("Dusty Blue", {
    breed: "Quarter Horse",
    birthYear: 2021,
    color: "Grulla",
    priceCents: 850000,
    registry: "AQHA",
    registrationNumber: "2706274",
  }),
  card("High Country", {
    breed: "quarter horse",
    birthYear: 2019,
    sex: "gelding",
    color: "Sorrel",
    priceCents: 1200000,
    tagline: "Cow sense and durability",
    featured: true,
  }),
  card("Roan River", { breed: "Appaloosa", birthYear: 2022 }),
];

describe("buildFacets", () => {
  it("offers only what the animals have, merging spellings", () => {
    const f = buildFacets(herd);
    expect(f.breeds).toEqual(["Appaloosa", "Quarter Horse"]);
    expect(f.years).toEqual([2022, 2021, 2019]);
    expect(f.colors).toEqual(["Grulla", "Sorrel"]);
    expect(f.sexes.map((s) => s.label)).toEqual(["Female", "Gelding"]);
    expect(f.price).toEqual({ min: 8500, max: 12000 });
  });
  it("has no price or color facet when nobody has one", () => {
    const f = buildFacets([card("A")]);
    expect(f.price).toBeNull();
    expect(f.colors).toEqual([]);
  });
});

describe("applyFilters", () => {
  const names = (f: Partial<typeof noFilters>) => applyFilters(herd, { ...noFilters, ...f }).map((c) => c.name);
  it("searches names, registrations and keywords", () => {
    expect(names({ q: "dusty" })).toEqual(["Dusty Blue"]);
    expect(names({ q: "2706274" })).toEqual(["Dusty Blue"]);
    expect(names({ q: "aqha 27-06274" })).toEqual(["Dusty Blue"]);
    expect(names({ q: "cow sense" })).toEqual(["High Country"]);
    expect(applyFilters([card("Bull", { earTag: "241" })], { ...noFilters, q: "241" })).toHaveLength(1);
    expect(names({ q: "nothing like this" })).toEqual([]);
  });
  it("filters by breed (any spelling), sex, year and color", () => {
    expect(names({ breed: "Quarter Horse" })).toEqual(["Dusty Blue", "High Country"]);
    expect(names({ sex: "gelding" })).toEqual(["High Country"]);
    expect(names({ year: "2022" })).toEqual(["Roan River"]);
    expect(names({ color: "grulla" })).toEqual(["Dusty Blue"]);
  });
  it("filters by price and leaves out animals with no listed price", () => {
    expect(names({ minPrice: 9000 })).toEqual(["High Country"]);
    expect(names({ maxPrice: 10000 })).toEqual(["Dusty Blue"]);
  });
  it("counts active filters", () => {
    expect(activeFilterCount(noFilters)).toBe(0);
    expect(activeFilterCount({ ...noFilters, q: " ", breed: "x", minPrice: 0 })).toBe(2);
  });
});

describe("sortCards", () => {
  const order = (k: Parameters<typeof sortCards>[1]) => sortCards(herd, k).map((c) => c.name);
  it("sorts by age, price and name, with missing values last", () => {
    expect(order("youngest")).toEqual(["Roan River", "Dusty Blue", "High Country"]);
    expect(order("oldest")).toEqual(["High Country", "Dusty Blue", "Roan River"]);
    expect(order("price_low")).toEqual(["Dusty Blue", "High Country", "Roan River"]);
    expect(order("price_high")).toEqual(["High Country", "Dusty Blue", "Roan River"]);
    expect(order("name")).toEqual(["Dusty Blue", "High Country", "Roan River"]);
  });
  it("leads with featured animals in ranch order", () => {
    expect(order("ranch")[0]).toBe("High Country");
  });
});
