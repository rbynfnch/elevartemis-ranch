import { speciesTerms, type Species } from "@/lib/domain/species";
import type { CategoryRow, SiteSettings, SpeciesSettings } from "./get-site";

export type NavLink = { label: string; href: string };
/** `heading` labels the group of children, e.g. "Herefords" under Cattle. */
export type NavItem = NavLink & { heading?: string; children?: NavLink[] };

type NavInput = Pick<SiteSettings, "enabledSpecies" | "navCounts" | "categories" | "contentCounts"> & {
  speciesSettings?: SiteSettings["speciesSettings"];
};

/**
 * Builds the public navigation from what actually exists.
 * A category with no public animals is omitted; a species with no public
 * animals disappears entirely; Gallery / updates / FAQ hide when empty.
 * Per-ranch settings choose, order and label categories (e.g. Cattle →
 * Herefords → Bulls, Yearlings, Cows, For Sale).
 */
export function buildNavigation(site: NavInput): NavItem[] {
  const memorial = Object.values(site.navCounts).reduce((sum, counts) => sum + (counts?.memorial ?? 0), 0);
  const items: NavItem[] = [
    { label: "Home", href: "/" },
    memorial > 0
      ? {
          label: "About",
          href: "/about",
          children: [
            { label: "Our Story", href: "/about" },
            { label: "In Memory", href: "/about/in-memory" },
          ],
        }
      : { label: "About", href: "/about" },
  ];

  for (const species of ["horse", "cattle"] as const satisfies readonly Species[]) {
    if (!site.enabledSpecies.includes(species)) continue;
    const settings = site.speciesSettings?.[species];
    const children = speciesChildren(species, site.navCounts[species] ?? {}, site.categories, settings);
    if (children.length === 0) continue;
    const terms = speciesTerms[species];
    items.push({
      label: settings?.navLabel ?? terms.plural,
      href: `/${terms.path}`,
      ...(settings?.breedHeading ? { heading: settings.breedHeading } : {}),
      children,
    });
  }

  if (site.contentCounts.gallery > 0) items.push({ label: "Gallery", href: "/gallery" });
  if (site.contentCounts.posts > 0) items.push({ label: "What's Happening", href: "/on-the-ranch" });
  if (site.contentCounts.faqs > 0) items.push({ label: "FAQ", href: "/faq" });
  items.push({ label: "Contact", href: "/contact" });
  return items;
}

/** Categories this ranch uses for a species, in the ranch's order. */
export function ranchCategories(
  species: Species,
  categories: CategoryRow[],
  settings?: SpeciesSettings,
): CategoryRow[] {
  const ofSpecies = categories.filter((c) => c.species === species);
  if (settings?.categories) {
    return settings.categories
      .map((id) => ofSpecies.find((c) => c.id === id))
      .filter((c): c is CategoryRow => Boolean(c));
  }
  return [...ofSpecies].sort((a, b) => a.sort_order - b.sort_order);
}

function speciesChildren(
  species: Species,
  counts: Record<string, number>,
  categories: CategoryRow[],
  settings?: SpeciesSettings,
): NavLink[] {
  const terms = speciesTerms[species];
  const base = `/${terms.path}`;
  const has = (bucket: string) => (counts[bucket] ?? 0) > 0;

  const links: NavLink[] = ranchCategories(species, categories, settings)
    .filter((c) => has(c.key))
    .map((c) => ({ label: c.label_plural, href: `${base}/${c.path_segment}` }));

  if ((settings?.showRetired ?? true) && has("retired"))
    links.push({ label: terms.retiredHeading, href: `${base}/retired` });
  if ((settings?.showReference ?? true) && has("reference"))
    links.push({ label: terms.referenceHeading, href: `${base}/${terms.referencePath}` });
  if ((settings?.showForSale ?? true) && has("for_sale")) links.push({ label: "For Sale", href: `${base}/for-sale` });
  if ((settings?.showSold ?? true) && has("sold")) links.push({ label: "Sold", href: `${base}/sold` });
  return links;
}
