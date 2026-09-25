import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { buildNavigation } from "@/lib/site/navigation";
import { paletteStyle } from "@/lib/brand/tokens";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PreviewBanner } from "@/components/site/preview-banner";

export async function generateMetadata({ params }: LayoutProps<"/site/[ranch]">): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  const indexable = site.status === "live" && !site.seo.noindex;
  return {
    title: { default: site.name, template: site.seo.titleTemplate.replace("{ranch}", site.name) },
    description: site.seo.description ?? undefined,
    robots: indexable ? undefined : { index: false, follow: false },
    metadataBase: site.primaryHostname ? new URL(`https://${site.primaryHostname}`) : undefined,
    verification: site.seo.gscVerification ? { google: site.seo.gscVerification } : undefined,
  };
}

export default function RanchSiteLayout({ children, params }: LayoutProps<"/site/[ranch]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <RanchFrame params={params}>{children}</RanchFrame>
    </Suspense>
  );
}

async function RanchFrame({
  params,
  children,
}: {
  params: LayoutProps<"/site/[ranch]">["params"];
  children: React.ReactNode;
}) {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) notFound();

  return (
    <div
      data-font-preset={site.brand.fontPreset}
      style={paletteStyle(site.brand.palette)}
      className="flex min-h-dvh flex-col bg-paper font-sans text-ink"
    >
      <a
        href="#main"
        className="sr-only z-50 bg-primary px-4 py-3 text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {site.status !== "live" ? <PreviewBanner /> : null}
      <SiteHeader brand={site.brand} items={buildNavigation(site)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter site={site} />
    </div>
  );
}
