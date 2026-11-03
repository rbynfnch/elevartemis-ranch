import { describe, expect, it } from "vitest";
import { resolveListing } from "./listing-pages";
import type { CategoryRow, SpeciesSettings } from "./get-site";

const cat = (id: string, species: "horse" | "cattle", plural: string, path: string, sort: number): CategoryRow => ({
  id,
  species,
  key: id.split(".")[1],
  label_singular: plural.slice(0, -1),
  label_plural: plural,
  path_segment: path,
  groups_by_birth_year: false,
  sort_order: sort,
});
const categories = [
  cat("horse.stallion", "horse", "Stallions", "stallions", 10),
  cat("cattle.bull", "cattle", "Bulls", "bulls", 10),
  cat("cattle.yearling", "cattle", "Yearlings", "yearlings", 15),
  cat("cattle.cow", "cattle", "Cows", "cows", 20),
];
const herefords: SpeciesSettings = {
  navLabel: null,
  breedHeading: "Herefords",
  categories: ["cattle.bull", "cattle.cow"],
  showRetired: false,
  showReference: false,
  showForSale: true,
  showSold: false,
};

describe("resolveListing", () => {
  it("finds a category page by its web address", () => {
    expect(resolveListing({ categories, speciesSettings: {} }, "horse", "stallions")).toMatchObject({
      type: "listing",
      kind: "category",
      categoryId: "horse.stallion",
      title: "Stallions",
    });
  });
  it("treats anything else as an animal's page", () => {
    expect(resolveListing({ categories, speciesSettings: {} }, "horse", "midnight-sonata")).toEqual({ type: "animal" });
  });
  it("does not offer another species' category", () => {
    expect(resolveListing({ categories, speciesSettings: {} }, "horse", "bulls")).toEqual({ type: "animal" });
  });
  it("knows the special pages, in the species' own words", () => {
    const site = { categories, speciesSettings: {} };
    expect(resolveListing(site, "cattle", "for-sale")).toMatchObject({ kind: "for_sale", title: "Cattle For Sale" });
    expect(resolveListing(site, "cattle", "reference-sires")).toMatchObject({
      kind: "reference",
      title: "Reference Sires",
    });
    expect(resolveListing(site, "horse", "previous-stallions")).toMatchObject({
      kind: "reference",
      title: "Previous Stallions",
    });
  });
  it("hides pages and categories the ranch has turned off", () => {
    const site = { categories, speciesSettings: { cattle: herefords } };
    expect(resolveListing(site, "cattle", "sold")).toEqual({ type: "none" });
    expect(resolveListing(site, "cattle", "retired")).toEqual({ type: "none" });
    expect(resolveListing(site, "cattle", "yearlings")).toEqual({ type: "none" });
    expect(resolveListing(site, "cattle", "bulls")).toMatchObject({ kind: "category" });
    expect(resolveListing(site, "cattle", "for-sale")).toMatchObject({ kind: "for_sale" });
  });
});
