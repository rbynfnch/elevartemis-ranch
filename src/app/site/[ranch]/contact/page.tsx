import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { pageMetadata } from "@/lib/site/seo";
import { getContactPage } from "@/lib/site/get-contact";
import { getPageHero } from "@/lib/site/page-hero";
import { DEFAULT_FORM_HEADING, DEFAULT_FORM_HINT } from "@/lib/site/contact";
import { topicOptions } from "@/lib/contact/inquiry";
import { createPublicClient } from "@/lib/supabase/public";
import { ContactForm } from "@/components/site/contact-form";

type Params = PageProps<"/site/[ranch]/contact">["params"];
type Search = PageProps<"/site/[ranch]/contact">["searchParams"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  return pageMetadata(site, "contact", {
    title: "Contact",
    description: `Get in touch with ${site.name}.`,
    path: "/contact",
  });
}

export default function Contact({ params, searchParams }: PageProps<"/site/[ranch]/contact">) {
  return (
    <Suspense fallback={null}>
      <Page params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const Line = () => <span aria-hidden="true" className="h-px flex-1 bg-accent/60" />;

async function Page({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) notFound();

  const q = await searchParams;
  const slug = typeof q.animal === "string" ? q.animal.slice(0, 200) : "";
  const [page, hero, animal] = await Promise.all([
    getContactPage(site.ranchId, site.slug),
    getPageHero(site, "contact", { title: "Contact" }),
    // An Inquire button on an animal's page brings its address here: only a public animal counts.
    slug
      ? createPublicClient()
          .from("public_animal_cards")
          .select("name")
          .eq("ranch_id", site.ranchId)
          .eq("slug", slug)
          .limit(1)
          .maybeSingle()
          .then((r) => r.data?.name ?? null)
      : Promise.resolve(null),
  ]);

  const c = page.content;
  const topics = topicOptions(site.enabledSpecies, animal);
  const phone = site.profile.publicPhone;
  const details = [
    c.publicEmail ? { key: "email", label: c.publicEmail, href: `mailto:${c.publicEmail}` } : null,
    phone ? { key: "phone", label: phone, href: `tel:${phone.replace(/[^\d+]/g, "")}` } : null,
  ].filter((d): d is { key: string; label: string; href: string } => d !== null);

  const hasAside = Boolean(page.photo || c.heading || c.text || details.length > 0);

  return (
    <>
      <header className="mx-auto max-w-[88rem] px-[var(--gutter)] pb-8 pt-12 text-center sm:pt-16">
        <p className="mx-auto flex max-w-xl items-center gap-5 text-[0.8125rem] font-semibold uppercase tracking-[0.3em] text-primary">
          <Line />
          Contact
          <Line />
        </p>
        <h1 className="mt-4 font-display text-4xl sm:text-6xl">{hero.title}</h1>
        {hero.subtitle ? (
          <p className="mx-auto mt-4 max-w-[52ch] font-serif text-lg italic text-ink-muted sm:text-xl">
            {hero.subtitle}
          </p>
        ) : null}
      </header>

      <div
        className={`mx-auto grid gap-8 px-[var(--gutter)] pb-12 lg:gap-10 ${hasAside ? "max-w-[88rem] lg:grid-cols-2" : "max-w-3xl"}`}
      >
        <section aria-labelledby="form-heading" className="relative rounded-[4px] bg-surface p-6 sm:p-8">
          <h2 id="form-heading" className="font-display text-3xl">
            {c.formHeading || DEFAULT_FORM_HEADING}
          </h2>
          <p className="mb-6 mt-2 text-ink-muted">{c.formHint || DEFAULT_FORM_HINT}</p>
          <ContactForm topics={topics} defaultTopic={animal ?? ""} animalSlug={animal ? slug : ""} />
        </section>

        {hasAside ? (
          <aside className="space-y-5">
            {page.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.photo.src}
                srcSet={page.photo.srcSet || undefined}
                sizes="(min-width: 1024px) 45vw, 100vw"
                alt={page.photo.alt}
                loading="lazy"
                decoding="async"
                className="aspect-[16/10] w-full object-cover"
                style={{ objectPosition: `${page.photo.focalX * 100}% ${page.photo.focalY * 100}%` }}
              />
            ) : null}
            {c.heading ? (
              <h2 className="flex items-center gap-5 font-serif text-2xl italic sm:text-3xl">
                <Line />
                <span className="text-center">{c.heading}</span>
                <Line />
              </h2>
            ) : null}
            {c.text ? <p className="mx-auto max-w-[52ch] text-center text-ink-muted">{c.text}</p> : null}
            {details.length > 0 ? (
              <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {details.map((d) => (
                  <li key={d.key}>
                    <a href={d.href} className="inline-flex min-h-11 items-center gap-3 no-underline hover:underline">
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5 text-accent"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        {d.key === "email" ? (
                          <path d="M3 6h18v12H3zM3 7l9 7 9-7" />
                        ) : (
                          <path d="M6 3h3l2 5-2 1.5a11 11 0 0 0 5.5 5.5L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3Z" />
                        )}
                      </svg>
                      {d.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>
        ) : null}
      </div>

      {/* The landscape across the bottom is the Contact banner photo from Page Banners. */}
      {hero.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero.photo.src}
          srcSet={hero.photo.srcSet || undefined}
          sizes="100vw"
          alt=""
          loading="lazy"
          decoding="async"
          className="h-40 w-full object-cover sm:h-56 lg:h-72"
          style={{ objectPosition: `${hero.photo.focalX * 100}% ${hero.photo.focalY * 100}%` }}
        />
      ) : null}
    </>
  );
}
