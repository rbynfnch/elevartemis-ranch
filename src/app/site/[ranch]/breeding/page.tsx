import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { getBreedingAnimals, type BreedingAnimal } from "@/lib/site/get-breeding";
import { breedingLabel } from "@/lib/animals/breeding";
import { getPageHero } from "@/lib/site/page-hero";
import { RichText } from "@/lib/content/rich-text";
import { speciesTerms } from "@/lib/domain/species";
import { PageHero } from "@/components/site/page-hero";
import { PhotoPlaceholder } from "@/components/animals/photo-placeholder";
import { JsonLd } from "@/components/site/json-ld";

type Params = PageProps<"/site/[ranch]/breeding">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  const animals = await getBreedingAnimals(site.ranchId, site.slug);
  const label = breedingLabel([...new Set(animals.map((a) => a.species))]);
  return {
    title: label,
    description: `${label} from ${site.name}: fees, availability and how to book.`,
    alternates: { canonical: "/breeding" },
  };
}

export default function Breeding({ params }: PageProps<"/site/[ranch]/breeding">) {
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
  const animals = await getBreedingAnimals(site.ranchId, site.slug);
  // The menu offers this page only when someone is offered for breeding.
  if (animals.length === 0) notFound();
  const label = breedingLabel([...new Set(animals.map((a) => a.species))]);
  const hero = await getPageHero(site, "breeding", { title: label });

  return (
    <>
      <PageHero eyebrow={site.name} title={hero.title} subtitle={hero.subtitle} photo={hero.photo} />
      <JsonLd
        data={animals.map((a) => ({
          "@context": "https://schema.org",
          "@type": "Service",
          name: `${a.display.badge}: ${a.name}`,
          provider: { "@type": "Organization", name: site.name },
          serviceType: speciesTerms[a.species].plural === "Horses" ? "Stallion breeding" : "Cattle breeding",
        }))}
      />
      <div className="mx-auto max-w-[88rem] space-y-12 px-[var(--gutter)] py-10 lg:py-14">
        <ul className="space-y-12">
          {animals.map((a) => (
            <li key={a.id}>
              <ServiceCard animal={a} brandMark={site.brand.mark} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function ServiceCard({ animal: a, brandMark }: { animal: BreedingAnimal; brandMark: string | null }) {
  const d = a.display;
  const inquire = d.cta?.href ?? `/contact?animal=${encodeURIComponent(a.href.split("/").pop() ?? "")}`;
  return (
    <article className="grid gap-6 border border-rule bg-white lg:grid-cols-[minmax(0,26rem)_1fr]">
      <div className="relative aspect-[4/3] bg-surface lg:aspect-auto lg:min-h-full">
        {a.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.photo.src}
            alt={a.photo.alt}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: `${a.photo.focalX * 100}% ${a.photo.focalY * 100}%` }}
          />
        ) : (
          <PhotoPlaceholder mark={brandMark} className="absolute inset-0 size-full" />
        )}
      </div>
      <div className="space-y-5 p-6 lg:p-8">
        <header className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-accent">{d.badge}</p>
          <h2 className="font-display text-3xl">
            <Link
              href={a.href}
              className="no-underline hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-8"
            >
              {a.name}
            </Link>
          </h2>
          <p className="text-ink-muted">{[a.breed, a.birthYear].filter(Boolean).join(" · ")}</p>
        </header>

        {d.facts.length > 0 ? (
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {d.facts.map((f) => (
              <div key={f.label} className="border-b border-rule pb-2">
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">{f.label}</dt>
                <dd className="font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {d.sections.map((s) => (
          <details key={s.heading} className="border-b border-rule pb-3">
            <summary className="cursor-pointer py-1 font-semibold">{s.heading}</summary>
            <RichText doc={s.body} className="prose-ranch mt-2 text-ink-muted" />
          </details>
        ))}

        <div className="flex flex-wrap items-center gap-4">
          {d.cta ? (
            <Link
              href={inquire}
              className="inline-flex min-h-12 items-center gap-3 bg-primary px-6 py-3 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-on-primary no-underline hover:bg-[color-mix(in_oklab,var(--c-primary)_80%,white)]"
            >
              {d.cta.label}
              <svg
                viewBox="0 0 16 16"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M2 8h11M9 4l4 4-4 4" />
              </svg>
            </Link>
          ) : null}
          {d.contract ? (
            <a
              href={d.contract.href}
              target="_blank"
              rel="noopener"
              className="text-sm font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
            >
              {d.contract.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
          <Link
            href={a.href}
            className="text-sm font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
          >
            See {a.name}&apos;s full page
          </Link>
        </div>
      </div>
    </article>
  );
}
