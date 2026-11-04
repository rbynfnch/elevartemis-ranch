import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { bannerPages, categoryBannerKey } from "@/lib/admin/banners/pages";
import { loadBanners } from "@/lib/admin/banners/service";
import { loadRanchCategories } from "@/lib/admin/animals/categories";
import { BannerEditor } from "@/components/admin/banners/banner-editor";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Page Banners" };

export default function PageBannersPage({ params }: PageProps<"/admin/[ranch]/page-banners">) {
  return (
    <Suspense fallback={null}>
      <Banners params={params} />
    </Suspense>
  );
}

async function Banners({ params }: { params: PageProps<"/admin/[ranch]/page-banners">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const db = await createServerSupabase();
  const [banners, categories] = await Promise.all([
    loadBanners(db, ctx.ranch.id),
    loadRanchCategories(db, ctx.ranch.id),
  ]);
  const found = banners.ok ? banners.data : {};
  const pages = bannerPages(ctx.ranch.enabledSpecies);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Page Banners</h1>
        <p className="max-w-[62ch] text-ink-muted">
          The big photograph across the top of each main page, with a headline and subheadline over it. Choose the photo
          from your Photo Library. Leave the headline blank and the page uses its own title. A page with no photo
          borrows one of your homepage photos.
        </p>
      </header>
      {!banners.ok ? <FormMessage>{banners.message}</FormMessage> : null}

      <div className="space-y-6">
        {pages.map((p) => (
          <BannerEditor key={p.key} pageKey={p.key} label={p.label} initial={found[p.key]} />
        ))}
      </div>

      {categories.length > 0 ? (
        <section aria-labelledby="category-banners" className="space-y-6">
          <div className="space-y-2">
            <h2 id="category-banners" className="font-display text-2xl">
              Category pages
            </h2>
            <p className="max-w-[62ch] text-ink-muted">
              Bulls, Cows, Mares and the rest each show just a photo across the top.
            </p>
          </div>
          {categories.map((c) => (
            <BannerEditor
              key={c.id}
              pageKey={categoryBannerKey(c.id)}
              label={`${c.species === "horse" ? "Horses" : "Cattle"}: ${c.label}`}
              imageOnly
              initial={found[categoryBannerKey(c.id)]}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
