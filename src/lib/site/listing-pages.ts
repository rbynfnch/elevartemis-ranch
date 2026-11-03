import { speciesTerms, type Species } from "@/lib/domain/species";
import type { CategoryRow, SiteSettings } from "./get-site";
import { ranchCategories } from "./navigation";
import type { ListingKind } from "@/lib/animals/listings";

type Site = Pick<SiteSettings, "categories" | "speciesSettings">;

export type ListingPage =
  | { type: "animal" }
  | {
      type: "listing";
      kind: Exclude<ListingKind, "overview">;
      categoryId?: string;
      title: string;
      category?: CategoryRow;
    };

/**
 * What a second path segment under /horses or /cattle means: a listing page
 * (For Sale, Sold, Retired, Previous Stallions, or one of the ranch's
 * categories) or, failing those, an animal's own page. A page the ranch has
 * turned off, or a category it doesn't offer, is "none".
 */
export function resolveListing(site: Site, species: Species, slug: string): ListingPage | { type: "none" } {
  const terms = speciesTerms[species];
  const settings = site.speciesSettings?.[species];

  if (slug === "for-sale") {
    return settings?.showForSale === false
      ? { type: "none" }
      : { type: "listing", kind: "for_sale", title: `${terms.plural} For Sale` };
  }
  if (slug === "sold") {
    return settings?.showSold === false
      ? { type: "none" }
      : { type: "listing", kind: "sold", title: `Sold ${terms.plural}` };
  }
  if (slug === "retired") {
    return settings?.showRetired === false
      ? { type: "none" }
      : { type: "listing", kind: "retired", title: terms.retiredHeading };
  }
  if (slug === terms.referencePath) {
    return settings?.showReference === false
      ? { type: "none" }
      : { type: "listing", kind: "reference", title: terms.referenceHeading };
  }

  const category = site.categories.find((c) => c.species === species && c.path_segment === slug);
  if (category) {
    const offered = ranchCategories(species, site.categories, settings).some((c) => c.id === category.id);
    return offered
      ? { type: "listing", kind: "category", categoryId: category.id, title: category.label_plural, category }
      : { type: "none" };
  }
  return { type: "animal" };
}
