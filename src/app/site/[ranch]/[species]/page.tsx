import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { pageMetadata } from "@/lib/site/seo";
import { ranchCategories } from "@/lib/site/navigation";
import { getListing } from "@/lib/animals/listings";
import { groupByCategory } from "@/lib/animals/listing-groups";
import { speciesTerms, type Species } from "@/lib/domain/species";
import { AnimalGrid, EmptyListing } from "@/components/animals/listing";
import { PageHero } from "@/components/site/page-hero";
import { getPageHero } from "@/lib/site/page-hero";

type Params = PageProps<"/site/[ranch]/[species]">["params"];

/** Cards shown per category on the overview before "View all". */
const PER_CATEGORY = 8;

function speciesFromPath(path: string): Species | null {
  const hit = (Object.entries(speciesTerms) as [Species, (typeof speciesTerms)[Species]][]).find(
    ([, t]) => t.path === path,
  );
  return hit ? hit[0] : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch, species: path } = await params;
  const species = speciesFromPath(path);
  const site = species ? await getSiteSettings(ranch) : null;
  if (!species || !site || !site.enabledSpecies.includes(species)) return {};
  const settings = site.speciesSettings?.[species];
  const title = settings?.navLabel ?? speciesTerms[species].plural;
  return pageMetadata(site, species === "horse" ? "horses" : "cattle", {
    title,
    description: `${settings?.breedHeading ?? title} from ${site.name}.`,
    path: `/${path}`,
  });
}

export default function SpeciesOverview({ params }: PageProps<"/site/[ranch]/[species]">) {
  return (
    <Suspense fallback={null}>
      <Overview params={params} />
    </Suspense>
  );
}

async function Overview({ params }: { params: Params }) {
  const { ranch, species: path } = await params;
  const species = speciesFromPath(path);
  if (!species) notFound();
  const site = await getSiteSettings(ranch);
  if (!site || !site.enabledSpecies.includes(species)) notFound();

  const terms = speciesTerms[species];
  const settings = site.speciesSettings?.[species];
  const animals = await getListing(site.ranchId, site.slug, { kind: "overview", species });
  const groups = groupByCategory(animals, ranchCategories(species, site.categories, settings));
  const hero = await getPageHero(site, species === "horse" ? "horses" : "cattle", {
    title: settings?.navLabel ?? terms.plural,
    subtitle: settings?.breedHeading,
  });

  // Pages beyond the categories, when the ranch offers them and they have animals.
  const counts = site.navCounts[species] ?? {};
  const more = [
    {
      show: (settings?.showForSale ?? true) && (counts.for_sale ?? 0) > 0,
      label: `${terms.plural} For Sale`,
      href: `/${terms.path}/for-sale`,
    },
    {
      show: (settings?.showRetired ?? true) && (counts.retired ?? 0) > 0,
      label: terms.retiredHeading,
      href: `/${terms.path}/retired`,
    },
    {
      show: (settings?.showReference ?? true) && (counts.reference ?? 0) > 0,
      label: terms.referenceHeading,
      href: `/${terms.path}/${terms.referencePath}`,
    },
    {
      show: (settings?.showSold ?? true) && (counts.sold ?? 0) > 0,
      label: `Sold ${terms.plural}`,
      href: `/${terms.path}/sold`,
    },
  ].filter((l) => l.show);

  return (
    <>
      <PageHero eyebrow={site.name} title={hero.title} subtitle={hero.subtitle} photo={hero.photo} />
      <div className="mx-auto max-w-[88rem] space-y-14 px-[var(--gutter)] py-10 lg:py-14">
        {groups.length === 0 ? (
          <EmptyListing />
        ) : (
          groups.map(({ category, animals: list }) => (
            <section key={category.id} aria-labelledby={`cat-${category.id}`} className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id={`cat-${category.id}`} className="font-display text-2xl">
                  <Link
                    href={`/${terms.path}/${category.path_segment}`}
                    className="no-underline hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-8"
                  >
                    {category.label_plural}
                  </Link>
                </h2>
                {list.length > PER_CATEGORY ? (
                  <Link
                    href={`/${terms.path}/${category.path_segment}`}
                    className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-primary no-underline decoration-accent decoration-2 underline-offset-8 hover:underline"
                  >
                    View all {list.length}
                  </Link>
                ) : null}
              </div>
              <AnimalGrid animals={list.slice(0, PER_CATEGORY)} brandMark={site.brand.mark} />
            </section>
          ))
        )}

        {more.length > 0 ? (
          <nav aria-label={`More ${terms.plural.toLowerCase()}`} className="border-t border-rule pt-8">
            <ul className="flex flex-wrap gap-x-8 gap-y-2">
              {more.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-11 items-center text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-primary no-underline decoration-accent decoration-2 underline-offset-8 hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </>
  );
}
