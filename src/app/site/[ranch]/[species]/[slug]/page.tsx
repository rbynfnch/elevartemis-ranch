import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { getAnimalPage } from "@/lib/animals/get-animal";
import { breedingDisplay } from "@/lib/animals/breeding";
import {
  formatPartialDate,
  performanceDisplay,
  plainSummary,
  profileFacts,
  saleDisplay,
} from "@/lib/animals/portfolio";
import { richTextIsEmpty } from "@/lib/content/empty";
import { RichText } from "@/lib/content/rich-text";
import { speciesTerms, type Species } from "@/lib/domain/species";
import { resolveListing } from "@/lib/site/listing-pages";
import { ranchCategories } from "@/lib/site/navigation";
import { ListingPageView } from "@/components/animals/listing-page";
import { Crumbs } from "@/components/animals/listing";
import { getOffspringFor, getPedigreeFor } from "@/lib/animals/get-relations";
import { PedigreeTree } from "@/components/animals/pedigree-tree";
import { MobileActionBar } from "@/components/animals/mobile-action-bar";
import { JsonLd } from "@/components/site/json-ld";
import { animalOfferJsonLd, breadcrumbJsonLd, faqJsonLd, quickAnswers } from "@/lib/site/structured-data";
import { Offspring } from "@/components/animals/offspring";
import { PhotoGallery } from "@/components/animals/photo-gallery";
import { PhotoPlaceholder } from "@/components/animals/photo-placeholder";
import { ButtonLink } from "@/components/ui/button";
import { ArrowIcon, AttributeStrip, Highlights, SaleRibbon, WatchVideoLink } from "@/components/animals/profile";

type Params = PageProps<"/site/[ranch]/[species]/[slug]">["params"];

function speciesFromPath(path: string): Species | null {
  const hit = (Object.entries(speciesTerms) as [Species, (typeof speciesTerms)[Species]][]).find(
    ([, terms]) => terms.path === path,
  );
  return hit ? hit[0] : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch, species: path, slug } = await params;
  const species = speciesFromPath(path);
  const site = species ? await getSiteSettings(ranch) : null;
  if (!species || !site) return {};
  const resolved = resolveListing(site, species, slug);
  if (resolved.type === "none") return {};
  if (resolved.type === "listing") {
    return {
      title: resolved.title,
      description: `${resolved.title} from ${site.name}.`,
      alternates: { canonical: `/${path}/${slug}` },
    };
  }
  const lookup = await getAnimalPage(site.ranchId, site.slug, species, slug);
  if (lookup.kind !== "found") return {};
  const a = lookup.animal;
  const category = site.categories.find((c) => c.id === a.categoryId)?.label_singular;
  const description =
    plainSummary(a.description) ??
    [a.registeredName ?? a.name, [a.breed, category].filter(Boolean).join(" "), site.name].filter(Boolean).join(" · ");
  const image = a.photos[0]?.large;
  return {
    title: a.name,
    description,
    alternates: { canonical: `/${path}/${a.slug}` },
    openGraph: { title: a.name, description, type: "website", ...(image ? { images: [image] } : {}) },
  };
}

export default function AnimalPortfolio({ params }: PageProps<"/site/[ranch]/[species]/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Portfolio params={params} />
    </Suspense>
  );
}

const statusBadge: Record<Species, Record<"retired" | "reference" | "deceased", string>> = {
  horse: { retired: "Retired", reference: "Previous Stallion", deceased: "In Memory" },
  cattle: { retired: "Retired", reference: "Reference Sire", deceased: "In Memory" },
};

async function Portfolio({ params }: { params: Params }) {
  const { ranch, species: path, slug } = await params;
  const species = speciesFromPath(path);
  if (!species) notFound();
  const site = await getSiteSettings(ranch);
  if (!site) notFound();

  const resolved = resolveListing(site, species, slug);
  if (resolved.type === "none") notFound();
  if (resolved.type === "listing") return <ListingPageView site={site} species={species} page={resolved} />;

  const lookup = await getAnimalPage(site.ranchId, site.slug, species, slug);
  if (lookup.kind === "moved") permanentRedirect(`/${path}/${lookup.slug}`);
  if (lookup.kind === "missing") notFound();
  const a = lookup.animal;
  const [pedigree, offspring] = await Promise.all([
    getPedigreeFor(a.id, site.slug),
    getOffspringFor(a.id, site.slug, a.species),
  ]);

  const category = site.categories.find((c) => c.id === a.categoryId)?.label_singular ?? null;
  const { strip, details } = profileFacts({
    species: a.species,
    breed: a.breed,
    color: a.color,
    height: a.height,
    earTag: a.earTag,
    weightLb: a.weightLb,
    headCount: a.headCount,
    sex: a.sex,
    birthDate: a.birthDate,
    birthPrecision: a.birthPrecision,
    registry: a.registry,
    registrationNumber: a.registrationNumber,
    registeredName: a.registeredName,
    ownerFacts: a.ownerFacts,
  });
  const sale = saleDisplay(a.sale);
  const breeding = breedingDisplay(a.species, a.breedingAvailable, a.breeding);
  const performance = a.species === "cattle" ? performanceDisplay(a.performance) : null;
  const memorial = a.programStatus === "deceased" ? formatPartialDate(a.deceasedOn, a.deceasedPrecision) : null;
  const settings = site.speciesSettings?.[a.species];
  const speciesLabel = settings?.navLabel ?? speciesTerms[a.species].plural;
  // The category crumb links only to a category page the ranch actually offers.
  const categoryRow = site.categories.find((c) => c.id === a.categoryId);
  const categoryPage =
    categoryRow && ranchCategories(a.species, site.categories, settings).some((c) => c.id === categoryRow.id)
      ? categoryRow
      : null;
  const publicPath = `/${path}/${a.slug}`;
  const inquiryHref = `/contact?animal=${encodeURIComponent(a.slug)}`;
  const hasStory = !richTextIsEmpty(a.description);

  // Plain answers to the questions people ask, from recorded facts only: shown on the page and marked up for answer engines.
  const origin = site.primaryHostname ? `https://${site.primaryHostname}` : null;
  const saleStatus =
    a.sale?.status === "available" || a.sale?.status === "pending" || a.sale?.status === "sold" ? a.sale.status : null;
  const answers = quickAnswers({
    name: a.name,
    forSale: saleStatus,
    price: sale?.price ?? null,
    birthYear: /^(\d{4})-/.test(a.birthDate ?? "") ? Number((a.birthDate ?? "").slice(0, 4)) : null,
    height: a.height,
    color: a.color,
    breed: a.breed,
    registration: [a.registry?.trim(), a.registrationNumber?.trim()].filter(Boolean).join(" #") || null,
    sire: pedigree.ancestors.get("S")?.name ?? null,
    dam: pedigree.ancestors.get("D")?.name ?? null,
    ranchName: site.name,
  });
  const faq = faqJsonLd(answers);
  const structured = [
    breadcrumbJsonLd(origin, [
      { name: "Home", path: "/" },
      { name: speciesLabel, path: `/${path}` },
      { name: a.name, path: publicPath },
    ]),
    animalOfferJsonLd(origin, {
      name: a.name,
      path: publicPath,
      description: plainSummary(a.description, 300),
      image: a.photos[0]?.large ?? null,
      breed: a.breed,
      priceCents: a.sale?.price_mode === "price" ? (a.sale.price_cents ?? null) : null,
      currency: a.sale?.currency ?? null,
      availability: saleStatus === "available" || saleStatus === "pending" ? saleStatus : null,
    }),
    ...(faq ? [faq] : []),
  ];

  const ribbon = sale?.badge ?? null;
  const badges = [
    a.programStatus !== "active" ? statusBadge[a.species][a.programStatus] : null,
    breeding?.badge,
  ].filter((b): b is string => Boolean(b));

  return (
    <article className="mx-auto max-w-[88rem] px-[var(--gutter)] pb-28 pt-8 lg:py-12">
      <JsonLd data={structured} />
      {a.programStatus !== "deceased" && saleStatus !== "sold" ? (
        <MobileActionBar inquiryHref={inquiryHref} phone={site.profile.publicPhone} />
      ) : null}
      <Crumbs
        items={[
          { label: speciesLabel, href: `/${path}` },
          ...(categoryPage
            ? [{ label: categoryPage.label_plural, href: `/${path}/${categoryPage.path_segment}` }]
            : category
              ? [{ label: category }]
              : []),
          { label: a.name },
        ]}
      />

      <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          {a.photos.length > 0 ? (
            <PhotoGallery photos={a.photos} name={a.name} />
          ) : (
            <div className="aspect-[4/3] overflow-hidden bg-surface">
              <PhotoPlaceholder mark={site.brand.mark} className="size-full" />
            </div>
          )}
        </div>

        <div className="relative space-y-7">
          {ribbon ? <SaleRibbon>{ribbon}</SaleRibbon> : null}

          <header className="space-y-3 pr-28 sm:pr-36">
            <p className="text-sm uppercase tracking-[0.2em] text-ink-muted">{a.breed ?? category}</p>
            <h1 className="font-display text-3xl sm:text-[2.75rem] sm:leading-[1.05]">{a.name}</h1>
          </header>

          {a.tagline ? <p className="font-serif text-xl italic leading-snug text-ink-muted">{a.tagline}</p> : null}
          {badges.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <li
                  key={b}
                  className="bg-primary px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-on-primary"
                >
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
          {memorial ? <p className="font-serif italic text-ink-muted">In loving memory · {memorial}</p> : null}

          {strip.length > 0 ? (
            <section aria-label="Attributes" className="border-y border-rule py-4">
              <AttributeStrip items={strip} />
            </section>
          ) : null}

          {hasStory ? <RichText doc={a.description} className="prose-ranch text-base text-ink-muted" /> : null}

          {a.highlights.length > 0 ? (
            <section aria-label="Highlights">
              <Highlights items={a.highlights} />
            </section>
          ) : null}

          {sale && sale.badge !== "Sold" ? (
            <section aria-labelledby="sale-heading" className="space-y-3 border-l-2 border-accent bg-surface px-5 py-4">
              <h2
                id="sale-heading"
                className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted"
              >
                {sale.badge}
              </h2>
              {sale.price ? <p className="font-display text-2xl">{sale.price}</p> : null}
              {sale.details.length > 0 ? (
                <dl className="space-y-1 text-sm">
                  {sale.details.map((d) => (
                    <div key={d.label} className="flex gap-2">
                      <dt className="font-semibold">{d.label}:</dt>
                      <dd>{d.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {!richTextIsEmpty(sale.description) ? (
                <RichText doc={sale.description} className="prose-ranch text-base text-ink-muted" />
              ) : null}
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={inquiryHref} className="gap-3 uppercase tracking-[0.14em]">
              {sale && sale.badge !== "Sold" ? `Inquire about ${a.name}` : `Ask about ${a.name}`}
              <ArrowIcon />
            </ButtonLink>
            {a.videoUrl ? <WatchVideoLink url={a.videoUrl} /> : null}
            {breeding?.cta ? (
              <ButtonLink
                href={breeding.cta.href ?? `${inquiryHref}&topic=breeding`}
                variant="secondary"
                {...(breeding.cta.href ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {breeding.cta.label}
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-16 space-y-14 lg:mt-20">
        {details.length > 0 ? (
          <Block title="Details" id="details">
            <FactGrid items={details} />
          </Block>
        ) : null}

        {a.sections.map((s) => (
          <Block key={s.heading} title={s.heading}>
            <RichText doc={s.body} className="prose-ranch text-ink-muted" />
          </Block>
        ))}

        {answers.length > 0 ? (
          <Block title="Quick answers" id="quick-answers">
            <dl className="grid gap-x-10 gap-y-5 md:grid-cols-2">
              {answers.map((q) => (
                <div key={q.question}>
                  <dt className="font-semibold">{q.question}</dt>
                  <dd className="mt-1 text-ink-muted">{q.answer}</dd>
                </div>
              ))}
            </dl>
          </Block>
        ) : null}

        {pedigree.ancestors.size > 0 ? (
          <Block title="Pedigree" id="pedigree">
            <PedigreeTree pedigree={pedigree} animalName={a.name} breed={a.breed} />
          </Block>
        ) : null}

        {offspring.length > 0 ? (
          <Block title={speciesTerms[a.species].offspringHeading} id="offspring">
            <Offspring years={offspring} brandMark={site.brand.mark} />
          </Block>
        ) : null}

        {breeding?.hasDetails ? <BreedingBlock display={breeding} species={a.species} /> : null}

        {performance ? <PerformanceBlock display={performance} /> : null}
      </div>
    </article>
  );
}

function Block({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-label={title}
      className="grid gap-5 border-t border-rule pt-8 lg:grid-cols-[14rem_1fr] lg:gap-14"
    >
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function FactGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
      {items.map((f) => (
        <div key={f.label} className="border-b border-rule pb-3">
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">{f.label}</dt>
          <dd className="mt-1">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BreedingBlock({
  display,
  species,
}: {
  display: NonNullable<ReturnType<typeof breedingDisplay>>;
  species: Species;
}) {
  return (
    <Block title={species === "horse" ? "Breeding Services" : "Breeding Information"} id="breeding">
      <div className="space-y-8">
        {display.facts.length > 0 ? <FactGrid items={display.facts} /> : null}
        {display.sections.map((s) => (
          <div key={s.heading} className="space-y-2">
            <h3 className="font-display text-xl">{s.heading}</h3>
            <RichText doc={s.body} className="prose-ranch text-ink-muted" />
          </div>
        ))}
        {display.contract ? (
          <p>
            <a
              href={display.contract.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
            >
              {display.contract.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        ) : null}
      </div>
    </Block>
  );
}

function PerformanceBlock({ display }: { display: NonNullable<ReturnType<typeof performanceDisplay>> }) {
  const showAccuracy = display.epds.some((e) => e.accuracy);
  const showPercentile = display.epds.some((e) => e.percentile);
  return (
    <Block title="Performance" id="performance">
      <div className="space-y-10">
        {display.weights.length > 0 ? <FactGrid items={display.weights} /> : null}
        {display.epds.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-display text-xl">Expected Progeny Differences (EPDs)</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-rule text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      Trait
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-semibold">
                      EPD
                    </th>
                    {showAccuracy ? (
                      <th scope="col" className="py-2 pr-4 text-right font-semibold">
                        Accuracy
                      </th>
                    ) : null}
                    {showPercentile ? (
                      <th scope="col" className="py-2 text-right font-semibold">
                        Rank
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {display.epds.map((e) => (
                    <tr key={e.code} className="border-b border-rule">
                      <th scope="row" className="py-2.5 pr-4 font-normal">
                        {e.label}
                        {e.label !== e.code ? <span className="ml-2 text-sm text-ink-muted">{e.code}</span> : null}
                      </th>
                      <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">{e.value}</td>
                      {showAccuracy ? <td className="py-2.5 pr-4 text-right tabular-nums">{e.accuracy}</td> : null}
                      {showPercentile ? <td className="py-2.5 text-right tabular-nums">{e.percentile}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {display.epdNote ? <p className="text-sm text-ink-muted">{display.epdNote}</p> : null}
          </div>
        ) : null}
      </div>
    </Block>
  );
}
