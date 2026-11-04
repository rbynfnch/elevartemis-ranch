import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { getGallery } from "@/lib/site/get-gallery";
import { getPageHero } from "@/lib/site/page-hero";
import { pageMetadata } from "@/lib/site/seo";
import { PageHero } from "@/components/site/page-hero";
import { GalleryGrid } from "@/components/site/gallery-grid";

type Params = PageProps<"/site/[ranch]/gallery">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  return pageMetadata(site, "gallery", {
    title: "Gallery",
    description: `Photos from ${site.name}.`,
    path: "/gallery",
  });
}

export default function Gallery({ params }: PageProps<"/site/[ranch]/gallery">) {
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
  const photos = await getGallery(site.ranchId, site.slug);
  // The menu offers this page only when there are photos to see.
  if (photos.length === 0) notFound();
  const hero = await getPageHero(site, "gallery", { title: "Gallery" });
  return (
    <>
      <PageHero eyebrow={site.name} title={hero.title} subtitle={hero.subtitle} photo={hero.photo} />
      <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-10 lg:py-14">
        <GalleryGrid photos={photos} />
      </div>
    </>
  );
}
