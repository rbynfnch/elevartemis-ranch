import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { listBreeds, starterBreeds } from "@/lib/admin/breeds/service";
import { speciesTerms } from "@/lib/domain/species";
import { BreedsManager } from "@/components/admin/breeds/breeds-manager";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Breeds" };

export default function BreedsPage({ params }: PageProps<"/admin/[ranch]/breeds">) {
  return (
    <Suspense fallback={null}>
      <Breeds params={params} />
    </Suspense>
  );
}

async function Breeds({ params }: { params: PageProps<"/admin/[ranch]/breeds">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await listBreeds(await createServerSupabase(), ctx.ranch.id);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Breeds</h1>
        <p className="max-w-[62ch] text-ink-muted">
          The breeds you raise. Choose from this list when you add or edit an animal. You can also add a breed right
          from an animal&apos;s page, and it appears here. Renaming a breed renames it on every animal that uses it.
        </p>
      </header>
      {result.ok ? (
        <BreedsManager
          breeds={result.data}
          sections={ctx.ranch.enabledSpecies.map((s) => ({
            value: s,
            label: speciesTerms[s].plural,
            starters: starterBreeds[s],
          }))}
        />
      ) : (
        <FormMessage tone="error">{result.message}</FormMessage>
      )}
    </div>
  );
}
