import { speciesTerms, type Species } from "@/lib/domain/species";
import type { CategoryRow, SiteSettings } from "./get-site";

export type NavLink = { label: string; href: string };
export type NavItem = NavLink & { children?: NavLink[] };

type NavInput = Pick<SiteSettings, "enabledSpecies" | "navCounts" | "categories" | "contentCounts">;

/**
 * Builds the public navigation from what actually exists.
 * A category with no public animals is omitted; a species with no public
 * animals disappears entirely; Gallery / updates / FAQ hide when empty.
 */
export function buildNavigation(site: NavInput): NavItem[] {
  const items: NavItem[] = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
  ];

  for (const species of ["horse", "cattle"] as const satisfies readonly Species[]) {
    if (!site.enabledSpecies.includes(species)) continue;
    const children = speciesChildren(species, site.navCounts[species] ?? {}, site.categories);
    if (children.length === 0) continue;
    const terms = speciesTerms[species];
    items.push({ label: terms.plural, href: `/${terms.path}`, children });
  }

  if (site.contentCounts.gallery > 0) items.push({ label: "Gallery", href: "/gallery" });
  if (site.contentCounts.posts > 0) items.push({ label: "What's Happening", href: "/on-the-ranch" });
  if (site.contentCounts.faqs > 0) items.push({ label: "FAQ", href: "/faq" });
  items.push({ label: "Contact", href: "/contact" });
  return items;
}

function speciesChildren(species: Species, counts: Record<string, number>, categories: CategoryRow[]): NavLink[] {
  const terms = speciesTerms[species];
  const base = `/${terms.path}`;
  const has = (bucket: string) => (counts[bucket] ?? 0) > 0;

  const links: NavLink[] = categories
    .filter((c) => c.species === species && has(c.key))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ label: c.label_plural, href: `${base}/${c.path_segment}` }));

  if (has("retired")) links.push({ label: terms.retiredHeading, href: `${base}/retired` });
  if (has("reference")) links.push({ label: terms.referenceHeading, href: `${base}/${terms.referencePath}` });
  if (has("for_sale")) links.push({ label: "For Sale", href: `${base}/for-sale` });
  if (has("sold")) links.push({ label: "Sold", href: `${base}/sold` });
  return links;
}
