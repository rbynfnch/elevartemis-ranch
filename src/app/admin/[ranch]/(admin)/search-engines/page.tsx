import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { bannerPages } from "@/lib/admin/banners/pages";
import { loadSeo } from "@/lib/admin/seo/service";
import { SeoEditor } from "@/components/admin/seo/seo-editor";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Search Engines" };

export default function SearchEnginesPage({ params }: PageProps<"/admin/[ranch]/search-engines">) {
  return (
    <Suspense fallback={null}>
      <SearchEngines params={params} />
    </Suspense>
  );
}

async function SearchEngines({ params }: { params: PageProps<"/admin/[ranch]/search-engines">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await loadSeo(await createServerSupabase(), ctx.ranch.id);
  const found = result.ok ? result.data : {};
  const pages = [{ key: "home", label: "Home" }, ...bannerPages(ctx.ranch.enabledSpecies)];
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Search Engines</h1>
        <p className="max-w-[62ch] text-ink-muted">
          What Google and other search engines show for each page, and the picture used when someone shares it. Leave a
          page alone and we write a sensible title and description from the page itself. Posts have their own fields in
          the post. Each animal&apos;s page is written from its own details.
        </p>
      </header>
      {!result.ok ? <FormMessage>{result.message}</FormMessage> : null}
      <div className="space-y-3">
        {pages.map((p) => (
          <SeoEditor key={p.key} pageKey={p.key} label={p.label} initial={found[p.key]} />
        ))}
      </div>
    </div>
  );
}
