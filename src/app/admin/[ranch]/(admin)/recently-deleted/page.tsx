import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { listAnimals } from "@/lib/admin/animals/service";
import { restoreAnimalAction } from "@/lib/admin/animals/actions";
import { AnimalThumb } from "@/components/admin/animals/animal-thumb";
import { DeleteForeverForm } from "@/components/admin/animals/archive-controls";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Recently Deleted" };

export default function RecentlyDeletedPage({ params, searchParams }: PageProps<"/admin/[ranch]/recently-deleted">) {
  return (
    <Suspense fallback={null}>
      <RecentlyDeleted params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function RecentlyDeleted({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/[ranch]/recently-deleted">["params"];
  searchParams: PageProps<"/admin/[ranch]/recently-deleted">["searchParams"];
}) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const q = await searchParams;
  const result = await listAnimals(await createServerSupabase(), ctx.ranch.id, { archived: true });
  const animals = result.ok ? result.data : [];
  const fmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl">Recently Deleted</h1>
        <p className="mt-2 max-w-[62ch] text-ink-muted">
          Deleted animals wait here, hidden from the website. Restore them any time, or delete them for good.
        </p>
      </header>
      {typeof q.restored === "string" ? <FormMessage tone="success">{q.restored} was restored.</FormMessage> : null}
      {typeof q.deleted === "string" ? (
        <FormMessage tone="success">{q.deleted} was permanently deleted.</FormMessage>
      ) : null}
      {animals.length === 0 ? (
        <p className="text-ink-muted">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {animals.map((a) => (
            <li key={a.id} className="grid gap-4 py-5 sm:grid-cols-[7rem_1fr_auto] sm:items-start">
              <AnimalThumb thumb={a.thumb} className="h-20 w-28" />
              <div>
                <p className="font-display text-lg">{a.name}</p>
                <p className="text-sm text-ink-muted">
                  {[a.categoryLabel, a.archivedAt ? `Deleted ${fmt.format(new Date(a.archivedAt))}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-[#8a2b1d]">Delete permanently…</summary>
                  <div className="mt-3">
                    <DeleteForeverForm id={a.id} name={a.name} />
                  </div>
                </details>
              </div>
              <form action={restoreAnimalAction}>
                <input type="hidden" name="id" value={a.id} />
                <button className={buttonClasses("primary")}>Restore</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
