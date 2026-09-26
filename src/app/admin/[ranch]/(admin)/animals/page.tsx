import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import clsx from "clsx";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { listAnimals } from "@/lib/admin/animals/service";
import { AnimalThumb } from "@/components/admin/animals/animal-thumb";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Animals" };

const filters = [
  ["", "All"],
  ["hidden", "Hidden"],
  ["for-sale", "For sale"],
  ["no-photo", "No photo"],
  ["sample", "Sample content"],
] as const;

export default function AnimalsPage({ params, searchParams }: PageProps<"/admin/[ranch]/animals">) {
  return (
    <Suspense fallback={null}>
      <Animals params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Animals({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/[ranch]/animals">["params"];
  searchParams: PageProps<"/admin/[ranch]/animals">["searchParams"];
}) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const q = await searchParams;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const enabled = ctx.ranch.enabledSpecies;
  const species = (str(q.species) as "horse" | "cattle" | undefined) ?? (enabled.length === 1 ? enabled[0] : undefined);
  const show = str(q.show) ?? "";
  const search = str(q.q) ?? "";
  const result = await listAnimals(await createServerSupabase(), ctx.ranch.id, { species, show, q: search });
  const animals = result.ok ? result.data : [];
  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { species, show, q: search, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/animals${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl">Animals</h1>
        <Link href="/admin/animals/new" className={buttonClasses("primary")}>
          Add Animal
        </Link>
      </header>

      {str(q.moved) ? (
        <FormMessage tone="success">
          {str(q.moved)} was moved to{" "}
          <Link href="/admin/recently-deleted" className="underline">
            Recently Deleted
          </Link>
          . You can restore it from there.
        </FormMessage>
      ) : null}
      {!result.ok ? <FormMessage>{result.message}</FormMessage> : null}

      {enabled.length > 1 ? (
        <nav aria-label="Species" className="flex gap-1 border-b border-rule">
          {[undefined, ...enabled].map((s) => (
            <Link
              key={s ?? "all"}
              href={href({ species: s })}
              aria-current={species === s ? "page" : undefined}
              className={clsx(
                "-mb-px min-h-11 border-b-2 px-4 py-2.5 no-underline",
                species === s ? "border-primary font-semibold" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {s === undefined ? "All" : s === "horse" ? "Horses" : "Cattle"}
            </Link>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap gap-2" aria-label="Show">
          {filters.map(([value, label]) => (
            <li key={value}>
              <Link
                href={href({ show: value || undefined })}
                aria-current={show === value ? "true" : undefined}
                className={clsx(
                  "inline-flex min-h-11 items-center border px-3 text-sm no-underline",
                  show === value ? "border-primary bg-primary text-on-primary" : "border-rule hover:bg-surface",
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <form action="/admin/animals" className="flex gap-2" role="search">
          {species ? <input type="hidden" name="species" value={species} /> : null}
          <label htmlFor="animal-search" className="sr-only">
            Find an animal by name
          </label>
          <input
            id="animal-search"
            name="q"
            defaultValue={search}
            placeholder="Find by name"
            className="min-h-11 w-48 border border-rule bg-white px-3"
          />
          <button type="submit" className={buttonClasses("secondary", "min-h-11 py-0")}>
            Find
          </button>
        </form>
      </div>

      {animals.length === 0 ? (
        <p className="text-ink-muted">{search || show ? "No animals match." : "No animals yet. Add your first one."}</p>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {animals.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/animals/${a.id}`}
                className="flex items-center gap-4 py-3 no-underline hover:bg-surface"
              >
                <AnimalThumb thumb={a.thumb} className="h-16 w-20 shrink-0 sm:h-20 sm:w-28" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg leading-tight">{a.name}</p>
                  <p className="text-sm text-ink-muted">{[a.categoryLabel, a.birthYear].filter(Boolean).join(" · ")}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    {!a.isPublished ? <Badge tone="muted">Hidden</Badge> : null}
                    {a.isFeatured ? <Badge>Featured</Badge> : null}
                    {a.saleStatus === "available" ? <Badge>For Sale</Badge> : null}
                    {a.saleStatus === "pending" ? <Badge>Sale Pending</Badge> : null}
                    {a.saleStatus === "sold" ? <Badge tone="muted">Sold</Badge> : null}
                    {a.programStatus === "retired" ? <Badge tone="muted">Retired</Badge> : null}
                    {a.programStatus === "deceased" ? <Badge tone="muted">In Memory</Badge> : null}
                    {!a.primaryMediaId ? <Badge tone="warn">No photo</Badge> : null}
                    {a.isDemo ? <Badge tone="warn">Sample</Badge> : null}
                  </p>
                </div>
                <span aria-hidden="true" className="pr-2 text-accent">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "muted" | "warn" }) {
  return (
    <span
      className={clsx(
        "px-1.5 py-0.5 font-semibold",
        tone === "default" && "bg-primary/10 text-primary",
        tone === "muted" && "bg-surface text-ink-muted",
        tone === "warn" && "bg-accent/15 text-ink",
      )}
    >
      {children}
    </span>
  );
}
