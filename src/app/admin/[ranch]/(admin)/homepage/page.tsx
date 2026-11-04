import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadSlides } from "@/lib/admin/homepage/service";
import { loadRanchCategories } from "@/lib/admin/animals/categories";
import { SlidesEditor } from "@/components/admin/homepage/slides-editor";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Homepage" };

export default function HomepageAdmin({ params }: PageProps<"/admin/[ranch]/homepage">) {
  return (
    <Suspense fallback={null}>
      <Homepage params={params} />
    </Suspense>
  );
}

async function Homepage({ params }: { params: PageProps<"/admin/[ranch]/homepage">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const db = await createServerSupabase();
  const [slides, categories] = await Promise.all([loadSlides(db, ctx.ranch.id), loadRanchCategories(db, ctx.ranch.id)]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Homepage</h1>
      {slides.ok ? (
        <SlidesEditor
          initial={slides.data}
          categories={categories.map((c) => ({ id: c.id, label: c.label, species: c.species }))}
        />
      ) : (
        <FormMessage>{slides.message}</FormMessage>
      )}
    </div>
  );
}
