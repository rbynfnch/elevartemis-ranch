import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { pageMetadata } from "@/lib/site/seo";
import { getMemorial } from "@/lib/animals/memorial";
import { speciesTerms } from "@/lib/domain/species";
import { AnimalGrid } from "@/components/animals/listing";
import { PageHero } from "@/components/site/page-hero";
import { getPageHero } from "@/lib/site/page-hero";

type Params = PageProps<"/site/[ranch]/about/in-memory">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  return pageMetadata(site, "in-memory", {
    title: "In Memory",
    description: `Remembering the animals of ${site.name}.`,
    path: "/about/in-memory",
  });
}

export default function InMemory({ params }: PageProps<"/site/[ranch]/about/in-memory">) {
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

  const animals = await getMemorial(site.ranchId, site.slug);
  // The menu only offers this page when there is someone to remember.
  if (animals.length === 0) notFound();

  const sections = site.enabledSpecies
    .map((species) => ({ species, list: animals.filter((a) => a.species === species) }))
    .filter((s) => s.list.length > 0);

  const hero = await getPageHero(site, "in-memory", {
    title: "In Memory",
    subtitle: `Remembering the animals of ${site.name}`,
  });

  return (
    <>
      <PageHero eyebrow="About" title={hero.title} subtitle={hero.subtitle} photo={hero.photo} />
      <div className="mx-auto max-w-[88rem] space-y-12 px-[var(--gutter)] py-10 lg:py-14">
        {sections.map(({ species, list }) => (
          <section key={species} aria-labelledby={`memory-${species}`} className="space-y-6">
            {sections.length > 1 ? (
              <h2 id={`memory-${species}`} className="font-display text-2xl">
                {speciesTerms[species].plural}
              </h2>
            ) : (
              <h2 id={`memory-${species}`} className="sr-only">
                {speciesTerms[species].plural}
              </h2>
            )}
            <AnimalGrid animals={list} brandMark={site.brand.mark} />
          </section>
        ))}
        <p className="text-sm text-ink-muted">
          <Link href="/" className="underline decoration-accent decoration-2 underline-offset-4">
            Back to {site.name}
          </Link>
        </p>
      </div>
    </>
  );
}
