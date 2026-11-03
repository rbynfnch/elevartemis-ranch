import { speciesTerms, type Species } from "@/lib/domain/species";

export type SlideCta = {
  kind: "none" | "page" | "category" | "animal" | "external";
  page: string | null;
  categoryId: string | null;
  url: string | null;
};

const pagePaths: Record<string, string> = {
  home: "/",
  about: "/about",
  horses: "/horses",
  cattle: "/cattle",
  for_sale: "/for-sale",
  horses_for_sale: "/horses/for-sale",
  cattle_for_sale: "/cattle/for-sale",
  gallery: "/gallery",
  updates: "/on-the-ranch",
  faq: "/faq",
  contact: "/contact",
};

type Lookups = {
  categories: { id: string; species: Species; path_segment: string }[];
  animal?: { species: Species; slug: string } | null;
};

/**
 * Where a hero button goes, or null when it has nowhere valid to go
 * (e.g. the linked animal was deleted: the button quietly disappears).
 */
export function slideHref(cta: SlideCta, lookups: Lookups): string | null {
  switch (cta.kind) {
    case "page":
      return (cta.page && pagePaths[cta.page]) || null;
    case "category": {
      const c = lookups.categories.find((x) => x.id === cta.categoryId);
      return c ? `/${speciesTerms[c.species].path}/${c.path_segment}` : null;
    }
    case "animal":
      return lookups.animal ? `/${speciesTerms[lookups.animal.species].path}/${lookups.animal.slug}` : null;
    case "external":
      return cta.url && /^https?:\/\//i.test(cta.url) ? cta.url : null;
    default:
      return null;
  }
}
