import { describe, expect, it } from "vitest";
import { buildNavigation } from "./navigation";
import type { CategoryRow } from "./get-site";

const categories: CategoryRow[] = [
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
