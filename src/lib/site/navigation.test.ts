import { describe, expect, it } from "vitest";
import { buildNavigation } from "./navigation";
import type { CategoryRow } from "./get-site";

const cattleCategory = (key: string, plural: string, path: string, sort: number): CategoryRow => ({
  id: `cattle.${key}`,
  species: "cattle",
  key,
  label_singular: plural.slice(0, -1),
  label_plural: plural,
  path_segment: path,
  groups_by_birth_year: false,
  sort_order: sort,
});

const categories: CategoryRow[] = [
  cattleCategory("bull", "Bulls", "bulls", 10),
  cattleCategory("yearling", "Yearlings", "yearlings", 15),
  cattleCategory("cow", "Cows", "cows", 20),
  {
    id: "horse.stallion",
    species: "horse",
    key: "stallion",
    label_singular: "Stallion",
    label_plural: "Stallions",
    path_segment: "stallions",
    groups_by_birth_year: false,
    sort_order: 10,
  },
  {
    id: "horse.mare",
    species: "horse",
    key: "mare",
    label_singular: "Mare",
    label_plural: "Mares",
    path_segment: "mares",
    groups_by_birth_year: false,
    sort_order: 20,
  },
  {
    id: "horse.foal",
    species: "horse",
    key: "foal",
    label_singular: "Foal",
    label_plural: "Foals",
    path_segment: "foals",
    groups_by_birth_year: true,
    sort_order: 30,
  },
  {
    id: "cattle.calf",
    species: "cattle",
    key: "calf",
    label_singular: "Calf",
    label_plural: "Calves",
    path_segment: "calves",
    groups_by_birth_year: true,
    sort_order: 50,
  },
];

describe("buildNavigation", () => {
  const base = {
    enabledSpecies: ["horse", "cattle"] as ("horse" | "cattle")[],
    categories,
    contentCounts: { posts: 0, faqs: 0, gallery: 0 },
  };

  it("omits empty categories and species", () => {
    const nav = buildNavigation({ ...base, navCounts: { horse: { stallion: 2, foal: 1, sold: 1 }, cattle: {} } });
    const horses = nav.find((i) => i.label === "Horses");
    expect(horses?.children?.map((c) => c.label)).toEqual(["Stallions", "Foals", "Sold"]);
    expect(nav.find((i) => i.label === "Cattle")).toBeUndefined();
  });

  it("hides gallery, updates and FAQ until they have content", () => {
    const empty = buildNavigation({ ...base, navCounts: { horse: {}, cattle: {} } });
    expect(empty.map((i) => i.label)).toEqual(["Home", "About", "Contact"]);
    const full = buildNavigation({
      ...base,
      navCounts: { horse: {}, cattle: {} },
      contentCounts: { posts: 2, faqs: 3, gallery: 9 },
    });
    expect(full.map((i) => i.label)).toEqual(["Home", "About", "Gallery", "What's Happening", "FAQ", "Contact"]);
  });

  it("adds In Memory under About only when there are deceased animals", () => {
    const without = buildNavigation({ ...base, navCounts: { horse: { stallion: 1 }, cattle: {} } });
    expect(without.find((i) => i.label === "About")?.children).toBeUndefined();
    const withMemorial = buildNavigation({ ...base, navCounts: { horse: { memorial: 2 }, cattle: { memorial: 1 } } });
    expect(withMemorial.find((i) => i.label === "About")?.children).toEqual([
      { label: "Our Story", href: "/about" },
      { label: "In Memory", href: "/about/in-memory" },
    ]);
    // Memorial animals are not a species category of their own.
    expect(withMemorial.find((i) => i.label === "Horses")).toBeUndefined();
  });

  it("follows the ranch's cattle program: Cattle → Herefords → Bulls, Yearlings, Cows, For Sale", () => {
    const herefords = {
      navLabel: null,
      breedHeading: "Herefords",
      categories: ["cattle.bull", "cattle.yearling", "cattle.cow"],
      showRetired: false,
      showReference: false,
      showForSale: true,
      showSold: false,
    };
    const counts = { bull: 2, yearling: 3, calf: 4, sold: 1, retired: 1, for_sale: 1 };
    const nav = buildNavigation({
      ...base,
      speciesSettings: { cattle: herefords },
      navCounts: { horse: {}, cattle: counts },
    });
    const cattle = nav.find((i) => i.label === "Cattle");
    expect(cattle?.heading).toBe("Herefords");
    // Cows appear once the ranch publishes one; calves, Sold and Retired aren't part of this program.
    expect(cattle?.children?.map((c) => c.label)).toEqual(["Bulls", "Yearlings", "For Sale"]);

    const withCows = buildNavigation({
      ...base,
      speciesSettings: { cattle: herefords },
      navCounts: { horse: {}, cattle: { ...counts, cow: 5 } },
    });
    expect(withCows.find((i) => i.label === "Cattle")?.children?.map((c) => c.label)).toEqual([
      "Bulls",
      "Yearlings",
      "Cows",
      "For Sale",
    ]);
  });

  it("uses a custom top-level label when set", () => {
    const nav = buildNavigation({
      ...base,
      speciesSettings: {
        horse: {
          navLabel: "Quarter Horses",
          breedHeading: null,
          categories: null,
          showRetired: true,
          showReference: true,
          showForSale: true,
          showSold: true,
        },
      },
      navCounts: { horse: { stallion: 1 }, cattle: {} },
    });
    expect(nav.find((i) => i.href === "/horses")?.label).toBe("Quarter Horses");
  });

  it("respects the ranch's enabled species", () => {
    const nav = buildNavigation({ ...base, enabledSpecies: ["horse"], navCounts: { horse: {}, cattle: { calf: 3 } } });
    expect(nav.find((i) => i.label === "Cattle")).toBeUndefined();
  });

  it("uses species terminology for reference pages", () => {
    const nav = buildNavigation({ ...base, navCounts: { horse: { reference: 1 }, cattle: { reference: 1 } } });
    expect(nav.find((i) => i.label === "Horses")?.children?.[0]).toEqual({
      label: "Previous Stallions",
      href: "/horses/previous-stallions",
    });
    expect(nav.find((i) => i.label === "Cattle")?.children?.[0]).toEqual({
      label: "Reference Sires",
      href: "/cattle/reference-sires",
    });
  });
});
