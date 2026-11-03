import { getListing } from "@/lib/animals/listings";
import type { SiteSettings } from "@/lib/site/get-site";
import { speciesTerms, type Species } from "@/lib/domain/species";
import type { ListingPage } from "@/lib/site/listing-pages";
import { AnimalGrid, EmptyListing, ListingHeader, YearGroups } from "@/components/animals/listing";

/** One listing page: a category, For Sale, Sold, Retired or Previous Stallions. */
export async function ListingPageView({
  site,
  species,
  page,
}: {
  site: SiteSettings;
  species: Species;
  page: Extract<ListingPage, { type: "listing" }>;
}) {
  const terms = speciesTerms[species];
  const settings = site.speciesSettings?.[species];
  const animals = await getListing(site.ranchId, site.slug, {
    kind: page.kind,
    species,
    categoryId: page.categoryId,
  });
  const byYear = Boolean(page.category?.groups_by_birth_year) && animals.some((a) => a.birthYear);

  return (
    <div className="mx-auto max-w-[88rem] space-y-12 px-[var(--gutter)] py-10 lg:py-14">
      <ListingHeader
        eyebrow={settings?.breedHeading}
        title={page.title}
        crumbs={[{ label: settings?.navLabel ?? terms.plural, href: `/${terms.path}` }, { label: page.title }]}
      />
      {animals.length === 0 ? (
        <EmptyListing />
      ) : byYear ? (
        <YearGroups animals={animals} brandMark={site.brand.mark} />
      ) : (
        <AnimalGrid animals={animals} brandMark={site.brand.mark} />
      )}
    </div>
  );
}
