import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { contrastProblems, contrastRatio, paletteKeys } from "@/lib/brand/tokens";
import { AnimalCard } from "@/components/animals/animal-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

/**
 * Review page for the temporary identity, rendered with THIS ranch's tokens.
 * Available only while a ranch is in draft; hidden once it goes live.
 */
export default function DesignSystemPage({ params }: PageProps<"/site/[ranch]/design-system">) {
  return (
    <Suspense fallback={null}>
      <DesignSystem params={params} />
    </Suspense>
  );
}

async function DesignSystem({ params }: { params: PageProps<"/site/[ranch]/design-system">["params"] }) {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site || site.status === "live") notFound();
  const palette = site.brand.palette;
  const problems = contrastProblems(palette);

  return (
    <div className="mx-auto max-w-[88rem] space-y-20 px-[var(--gutter)] py-16">
      <header>
        <h1 className="font-display text-3xl">Design system</h1>
        <p className="mt-3 max-w-[60ch] text-ink-muted">
          Temporary identity for {site.name}. Font preset: {site.brand.fontPreset}. Colours, type and the brand mark are
          replaceable per ranch without code changes.
        </p>
      </header>

      <section aria-labelledby="ds-colour">
        <h2 id="ds-colour" className="font-display text-2xl">
          Colour
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {paletteKeys.map((key) => (
            <li key={key} className="border border-rule">
              <div className="h-20" style={{ background: palette[key] }} />
              <div className="p-3 text-sm">
                <p className="font-semibold">{key}</p>
                <p className="text-ink-muted">{palette[key]}</p>
                <p className="text-ink-muted">{contrastRatio(palette[key], palette.paper).toFixed(1)}:1 on paper</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          {problems.length === 0
            ? "All required text pairs meet WCAG AA (4.5:1)."
            : `Contrast issues: ${problems.join("; ")}`}
        </p>
      </section>

      <section aria-labelledby="ds-type" className="space-y-6">
        <h2 id="ds-type" className="font-display text-2xl">
          Type
        </h2>
        <p className="font-display text-display">Horses and cattle</p>
        <p className="font-display text-3xl">Section heading in the display face</p>
        <p className="font-display text-xl">Card title, animal name</p>
        <p className="prose-ranch">
          Long-form reading uses the text serif at a comfortable measure, with generous leading for stories about the
          ranch, its animals and the people who raise them.
        </p>
        <p className="max-w-[68ch]">
          Interface text, labels and details use the sans. It stays legible at small sizes on a phone in bright light.
        </p>
        <p className="text-sm text-ink-muted">Small print and secondary details.</p>
      </section>

      <section aria-labelledby="ds-actions" className="space-y-6">
        <h2 id="ds-actions" className="font-display text-2xl">
          Actions
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button>Send message</Button>
          <ButtonLink href="/contact" variant="secondary">
            See what&apos;s for sale
          </ButtonLink>
          <ButtonLink href="/contact" variant="quiet">
            Read the full story
          </ButtonLink>
        </div>
        <div className="rule-lead max-w-md" />
        <div className="flex items-center gap-6 text-accent">
          <BrandMark letters={site.brand.mark ?? "R"} className="h-12 w-16" />
          <span className="text-sm text-ink-muted">Brand mark (temporary, text-based)</span>
        </div>
      </section>

      <section aria-labelledby="ds-cards">
        <h2 id="ds-cards" className="font-display text-2xl">
          Animal cards
        </h2>
        <p className="mt-2 max-w-[60ch] text-sm text-ink-muted">
          The second card has no breed, year or photo: those lines simply don&apos;t appear.
        </p>
        <ul className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          <li>
            <AnimalCard
              brandMark={site.brand.mark}
              animal={{
                name: "Juniper Blue",
                href: "#",
                categoryLabel: "Stallion",
                breed: "Quarter Horse",
                birthYear: 2014,
                badge: "For Sale",
              }}
            />
          </li>
          <li>
            <AnimalCard
              brandMark={site.brand.mark}
              animal={{ name: "Dusty Trail", href: "#", categoryLabel: "Gelding" }}
            />
          </li>
        </ul>
      </section>
    </div>
  );
}
