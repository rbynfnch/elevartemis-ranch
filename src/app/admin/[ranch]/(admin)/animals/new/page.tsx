import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAnimalAction } from "@/lib/admin/animals/actions";
import { loadBreedSuggestions, loadRanchCategories } from "@/lib/admin/animals/categories";
import { BasicsForm } from "@/components/admin/animals/basics-form";

export const metadata: Metadata = { title: "Add Animal" };

export default function NewAnimalPage({ params }: PageProps<"/admin/[ranch]/animals/new">) {
  return (
    <Suspense fallback={null}>
      <NewAnimal params={params} />
    </Suspense>
  );
}

async function NewAnimal({ params }: { params: PageProps<"/admin/[ranch]/animals/new">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const db = await createServerSupabase();
  const [categories, breeds] = await Promise.all([
    loadRanchCategories(db, ctx.ranch.id),
    loadBreedSuggestions(db, ctx.ranch.id),
  ]);
  return (
    <div className="space-y-8">
      <p className="text-sm">
        <Link href="/admin/animals" className="text-primary underline decoration-accent underline-offset-4">
          Animals
        </Link>
      </p>
      <header>
        <h1 className="font-display text-3xl">Add Animal</h1>
        <p className="mt-2 max-w-[62ch] text-ink-muted">
          Start with the basics. Next you can add photos, pedigree, sale details and more. New animals stay hidden from
          the website until you choose to show them.
        </p>
      </header>
      <BasicsForm
        action={createAnimalAction}
        categories={categories.filter((c) => ctx.ranch.enabledSpecies.includes(c.species))}
        enabledSpecies={ctx.ranch.enabledSpecies}
        breedSuggestions={breeds}
        submitLabel="Add Animal"
      />
    </div>
  );
}
