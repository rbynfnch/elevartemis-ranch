import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { pageMetadata } from "@/lib/site/seo";
import { ForSalePageView } from "@/components/animals/for-sale-page";

type Params = PageProps<"/site/[ranch]/for-sale">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  return pageMetadata(site, "for-sale", {
    title: "For Sale",
    description: `Horses and cattle for sale from ${site.name}.`,
    path: "/for-sale",
  });
}

export default function ForSale({ params }: PageProps<"/site/[ranch]/for-sale">) {
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

  return <ForSalePageView site={site} />;
}
