import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/site/get-site";
import { pageMetadata } from "@/lib/site/seo";
import { getHeroSlides } from "@/lib/site/get-home";
import { buildNavigation } from "@/lib/site/navigation";
import { getFeaturedAnimals } from "@/lib/animals/featured";
import { richTextIsEmpty } from "@/lib/content/empty";
import { RichText } from "@/lib/content/rich-text";
import { AnimalCard } from "@/components/animals/animal-card";
import { HeroSlider } from "@/components/site/hero-slider";
import { SectionLinks } from "@/components/site/section-links";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata({ params }: PageProps<"/site/[ranch]">): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  return pageMetadata(site, "home", { title: site.name, description: site.profile.tagline, path: "/" });
}

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

  const [slides, featured] = await Promise.all([
    getHeroSlides(site.ranchId, site.slug, site.categories),
    getFeaturedAnimals(site.ranchId, site.slug),
  ]);
  const nav = buildNavigation(site);
  const hasStory = !richTextIsEmpty(site.profile.intro);
  const forSale = nav.some((i) => i.href === "/for-sale");

  return (
    <>
      {slides.length > 0 ? (
        <HeroSlider slides={slides} ranchName={site.name} />
      ) : (
        // No slides yet: the ranch's own tagline, never filler.
        <section className="bg-night text-on-night">
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-24 lg:py-32">
            <h1 className="max-w-[22ch] font-display text-3xl sm:text-display">{site.profile.tagline ?? site.name}</h1>
          </div>
        </section>
      )}

      <SectionLinks items={nav} />

      {hasStory ? (
        <section aria-labelledby="story-heading" className="bg-paper">
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-16 lg:py-24">
            <div className="max-w-[44rem]">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.3em] text-ink-muted">Our story</p>
              <h2 id="story-heading" className="mt-3 font-display text-3xl">
                About {site.name}
              </h2>
              <RichText doc={site.profile.intro} className="prose-ranch mt-6 text-ink-muted" />
              <Link
                href="/about"
                className="mt-8 inline-flex min-h-11 items-center gap-3 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-primary no-underline decoration-accent decoration-2 underline-offset-8 hover:underline"
              >
                Our story
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
            </div>
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section aria-labelledby="featured-heading" className="bg-[color-mix(in_oklab,var(--c-paper)_70%,white)]">
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-16 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.3em] text-ink-muted">
                  Featured animals
                </p>
                <h2 id="featured-heading" className="mt-3 font-display text-3xl">
                  Meet the herd
                </h2>
              </div>
              {forSale ? (
                <Link
                  href="/for-sale"
                  className="inline-flex min-h-11 items-center text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-primary no-underline decoration-accent decoration-2 underline-offset-8 hover:underline"
                >
                  View all for sale
                </Link>
              ) : null}
            </div>
            <ul className="mt-10 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((animal) => (
                <li key={animal.href}>
                  <AnimalCard animal={animal} brandMark={site.brand.mark} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section
        aria-labelledby="visit-heading"
        className="relative isolate -mb-24 overflow-hidden bg-night text-on-night"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(90%_120%_at_85%_100%,color-mix(in_oklab,var(--c-primary)_50%,var(--c-night)),var(--c-night))]"
        />
        <div className="mx-auto flex max-w-[88rem] flex-col gap-8 px-[var(--gutter)] py-16 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 id="visit-heading" className="font-display text-3xl">
              Come see what we&rsquo;re building
            </h2>
            <p className="mt-4 text-on-night/85">
              Questions about an animal, or want to visit? We&rsquo;d love to hear from you.
            </p>
            <ButtonLink
              href="/contact"
              className="mt-8 !bg-primary !px-6 text-[0.75rem] uppercase tracking-[0.18em] !text-on-primary hover:!bg-[color-mix(in_oklab,var(--c-primary)_80%,white)]"
            >
              Get in touch
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
