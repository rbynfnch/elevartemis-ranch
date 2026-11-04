import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { getAboutPage } from "@/lib/site/get-about";
import { getPageHero } from "@/lib/site/page-hero";
import { PageHero } from "@/components/site/page-hero";
import { AboutSections } from "@/components/site/about-page";

type Params = PageProps<"/site/[ranch]/about">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  return {
    title: "About",
    description: site.profile.tagline ?? `About ${site.name}.`,
    alternates: { canonical: "/about" },
  };
}

export default function About({ params }: PageProps<"/site/[ranch]/about">) {
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
  const [data, hero] = await Promise.all([
    getAboutPage(site.ranchId, site.slug),
    getPageHero(site, "about", { title: site.name, subtitle: site.profile.tagline }),
  ]);
  return (
    <>
      <PageHero eyebrow="About" title={hero.title} subtitle={hero.subtitle} photo={hero.photo} />
      <AboutSections data={data} ranchName={site.name} mark={site.brand.mark} fallbackIntro={site.profile.intro} />
    </>
  );
}
