import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { listLibrary } from "@/lib/admin/library/service";
import { speciesTerms } from "@/lib/domain/species";
import { PhotoLibrary } from "@/components/admin/library/photo-library";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Photo Library" };

export default function PhotosPage({ params }: PageProps<"/admin/[ranch]/photos">) {
  return (
    <Suspense fallback={null}>
      <Photos params={params} />
    </Suspense>
  );
}

async function Photos({ params }: { params: PageProps<"/admin/[ranch]/photos">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await listLibrary(await createServerSupabase(), ctx.ranch.id);

  return result.ok ? (
    <PhotoLibrary
      photos={result.data}
      species={ctx.ranch.enabledSpecies.map((s) => ({ value: s, label: speciesTerms[s].plural }))}
    />
  ) : (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Photo Library</h1>
      <FormMessage tone="error">{result.message}</FormMessage>
    </div>
  );
}
