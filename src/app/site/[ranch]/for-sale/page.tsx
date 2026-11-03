import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { getListing } from "@/lib/animals/listings";
import { speciesTerms } from "@/lib/domain/species";
import { AnimalGrid, EmptyListing, ListingHeader } from "@/components/animals/listing";

type Params = PageProps<"/site/[ranch]/for-sale">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  return {
    title: "For Sale",
    description: `Horses and cattle for sale from ${site.name}.`,
    alternates: { canonical: "/for-sale" },
  };
}

export default function ForSale({ params }: PageProps<"/site/[ranch]/for-sale">) {
  return (
    <Suspense fallback={null}>
      <Page params={params} />
    </Suspense>
  );
}

async function Page({ params }: { params: Params }) {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) notFound();

  const animals = await getListing(site.ranchId, site.slug, { kind: "for_sale" });
  // Only species the ranch has turned for-sale pages on for.
  const sections = site.enabledSpecies
    .filter((s) => site.speciesSettings?.[s]?.showForSale !== false)
    .map((species) => ({ species, list: animals.filter((a) => a.species === species) }))
    .filter((s) => s.list.length > 0);

  return (
    <div className="mx-auto max-w-[88rem] space-y-14 px-[var(--gutter)] py-10 lg:py-14">
      <ListingHeader title="For Sale" crumbs={[{ label: "For Sale" }]} />
      {sections.length === 0 ? (
        <EmptyListing />
      ) : (
        sections.map(({ species, list }) => {
          const terms = speciesTerms[species];
          return (
            <section key={species} aria-labelledby={`sale-${species}`} className="space-y-6">
              <h2 id={`sale-${species}`} className="font-display text-2xl">
                {sections.length > 1 ? (
                  <Link
                    href={`/${terms.path}/for-sale`}
                    className="no-underline hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-8"
                  >
                    {terms.plural}
                  </Link>
                ) : (
                  terms.plural
                )}
              </h2>
              <AnimalGrid animals={list} brandMark={site.brand.mark} />
            </section>
          );
        })
      )}
    </div>
  );
}
