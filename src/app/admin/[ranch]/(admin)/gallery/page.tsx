import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadGallery } from "@/lib/admin/gallery/service";
import { GalleryEditor } from "@/components/admin/gallery/gallery-editor";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Gallery" };

export default function GalleryAdmin({ params }: PageProps<"/admin/[ranch]/gallery">) {
  return (
    <Suspense fallback={null}>
      <Gallery params={params} />
    </Suspense>
  );
}

async function Gallery({ params }: { params: PageProps<"/admin/[ranch]/gallery">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await loadGallery(await createServerSupabase(), ctx.ranch.id);
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Gallery</h1>
        <p className="max-w-[62ch] text-ink-muted">
          Pick the photos that appear on your website&apos;s Gallery page and put them in the order you like. Upload new
          photos in the Photo Library first.
        </p>
      </header>
      {result.ok ? <GalleryEditor initial={result.data} /> : <FormMessage>{result.message}</FormMessage>}
    </div>
  );
}
