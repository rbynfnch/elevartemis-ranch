import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { getFaqs, type PublicFaq } from "@/lib/site/get-faqs";
import { getPageHero } from "@/lib/site/page-hero";
import { pageMetadata } from "@/lib/site/seo";
import { RichText } from "@/lib/content/rich-text";
import { plainSummary } from "@/lib/animals/portfolio";
import { faqJsonLd } from "@/lib/site/structured-data";
import { PageHero } from "@/components/site/page-hero";
import { JsonLd } from "@/components/site/json-ld";

type Params = PageProps<"/site/[ranch]/faq">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  return pageMetadata(site, "faq", {
    title: "FAQ",
    description: `Answers to the questions people ask most about ${site.name}.`,
    path: "/faq",
  });
}

export default function Faq({ params }: PageProps<"/site/[ranch]/faq">) {
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
  const faqs = await getFaqs(site.ranchId, site.slug);
  // The menu offers this page only when there are questions to read.
  if (faqs.length === 0) notFound();
  const hero = await getPageHero(site, "faq", { title: "Frequently Asked Questions" });

  // Questions with the same group sit together, in the order the owner first used them.
  const groups: { name: string | null; items: PublicFaq[] }[] = [];
  for (const f of faqs) {
    const g = groups.find((x) => x.name === f.group);
    if (g) g.items.push(f);
    else groups.push({ name: f.group, items: [f] });
  }

  return (
    <>
      <PageHero eyebrow="FAQ" title={hero.title} subtitle={hero.subtitle} photo={hero.photo} />
      <JsonLd
        data={
          faqJsonLd(
            faqs
              .map((f) => ({ question: f.question, answer: plainSummary(f.answer, 1500) ?? "" }))
              .filter((f) => f.answer),
          ) ?? []
        }
      />
      <div className="mx-auto max-w-[56rem] space-y-12 px-[var(--gutter)] py-10 lg:py-14">
        {groups.map((g) => (
          <section key={g.name ?? "general"} aria-label={g.name ?? "Questions"} className="space-y-3">
            {g.name ? <h2 className="font-display text-2xl">{g.name}</h2> : null}
            <div className="divide-y divide-rule border-y border-rule">
              {g.items.map((f) => (
                <details key={f.id} className="group py-1">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold">
                    {f.question}
                    <svg
                      viewBox="0 0 16 16"
                      className="size-4 shrink-0 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      aria-hidden="true"
                    >
                      <path d="m3 6 5 5 5-5" />
                    </svg>
                  </summary>
                  <RichText doc={f.answer} className="prose-ranch pb-4 text-ink-muted" />
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
