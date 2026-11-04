import { describe, expect, it } from "vitest";
import type { ListingCard } from "./cards";
import { groupByBirthYear, groupByCategory } from "./listing-groups";

const card = (name: string, categoryId: string, birthYear: number | null): ListingCard => ({
  name,
  href: `/x/${name}`,
  categoryLabel: "",
  birthYear,
  species: "cattle",
  categoryId,
  groupsByBirthYear: true,
  sex: null,
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
  displayOrder: 0,
});

describe("groupByBirthYear", () => {
  it("puts the newest year first and animals with no year last, unlabelled", () => {
    const groups = groupByBirthYear([
      card("a", "c", 2023),
      card("b", "c", null),
      card("c", "c", 2025),
      card("d", "c", 2023),
    ]);
    expect(groups.map((g) => g.year)).toEqual([2025, 2023, null]);
    expect(groups[1].animals.map((a) => a.name)).toEqual(["a", "d"]);
  });
  it("returns nothing for no animals", () => {
    expect(groupByBirthYear([])).toEqual([]);
  });
});

describe("groupByCategory", () => {
  it("follows the ranch's category order and drops empty categories", () => {
    const cats = [{ id: "bull" }, { id: "yearling" }, { id: "cow" }];
    const groups = groupByCategory([card("a", "cow", 2020), card("b", "bull", 2021), card("c", "cow", 2019)], cats);
    expect(groups.map((g) => g.category.id)).toEqual(["bull", "cow"]);
    expect(groups[1].animals.map((a) => a.name)).toEqual(["a", "c"]);
  });
});
