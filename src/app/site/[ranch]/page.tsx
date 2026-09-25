import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { getFeaturedAnimals } from "@/lib/animals/featured";
import { RichText } from "@/lib/content/rich-text";
import { AnimalCard } from "@/components/animals/animal-card";
import { ButtonLink } from "@/components/ui/button";

/**
 * TEMPORARY home page (Phase 2). Phase 8 replaces the top with the hero
 * slider and adds the curated homepage sections.
 */
export default function RanchHome({ params }: PageProps<"/site/[ranch]">) {
  return (
    <Suspense fallback={null}>
      <Home params={params} />
    </Suspense>
  );
}

async function Home({ params }: { params: PageProps<"/site/[ranch]">["params"] }) {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) notFound();
  const featured = await getFeaturedAnimals(site.ranchId, site.slug);

  return (
    <>
      <section className="mx-auto max-w-[88rem] px-[var(--gutter)] pb-16 pt-20 md:pt-28">
        <h1 className="max-w-[14ch] font-display text-display text-ink">{site.profile.tagline ?? site.name}</h1>
        <div className="rule-lead mt-10 max-w-xl" />
        <RichText doc={site.profile.intro} className="prose-ranch mt-8 text-ink-muted" />
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/contact">Contact the ranch</ButtonLink>
          {site.status !== "live" ? (
            <ButtonLink href="/design-system" variant="secondary">
              Review the design system
            </ButtonLink>
          ) : null}
        </div>
      </section>

      {featured.length > 0 ? (
        <section aria-labelledby="featured-heading" className="mx-auto max-w-[88rem] px-[var(--gutter)] py-12">
          <h2 id="featured-heading" className="font-display text-3xl">
            Featured animals
          </h2>
          <ul className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((animal) => (
              <li key={animal.href}>
                <AnimalCard animal={animal} brandMark={site.brand.mark} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
