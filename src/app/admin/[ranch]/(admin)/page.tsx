import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { summarizeDashboard } from "@/lib/admin/dashboard";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage({ params, searchParams }: PageProps<"/admin/[ranch]">) {
  return (
    <Suspense fallback={null}>
      <Dashboard params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/[ranch]">["params"];
  searchParams: PageProps<"/admin/[ranch]">["searchParams"];
}) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const query = await searchParams;
  const db = await createServerSupabase();
  const ranchId = ctx.ranch.id;

  const [animals, sales, slides, posts, faqs, priv] = await Promise.all([
    db
      .from("animals")
      .select(
        "id, name, species, category_id, record_scope, is_published, primary_media_id, birth_date, birth_precision, archived_at, is_demo, category_confirmed_at",
      )
      .eq("ranch_id", ranchId),
    db.from("sale_listings").select("animal_id, status").eq("ranch_id", ranchId),
    db
      .from("hero_slides")
      .select("id, headline, media_id, is_active, archived_at, cta_kind, cta_animal_id, is_demo")
      .eq("ranch_id", ranchId),
    db.from("posts").select("status, archived_at, is_demo").eq("ranch_id", ranchId),
    db.from("faqs").select("id", { count: "exact", head: true }).eq("ranch_id", ranchId).eq("is_demo", true),
    db.from("ranch_private").select("inquiry_email").eq("ranch_id", ranchId).maybeSingle(),
  ]);
  for (const r of [animals, sales, slides, posts, faqs, priv]) {
    if (r.error) throw new Error(`Loading the dashboard failed: ${r.error.message}`);
  }

  const summary = summarizeDashboard({
    animals: animals.data ?? [],
    sales: sales.data ?? [],
    slides: slides.data ?? [],
    posts: posts.data ?? [],
    faqDemoCount: faqs.count ?? 0,
    inquiryEmail: priv.data?.inquiry_email ?? null,
    today: new Date().toISOString().slice(0, 10),
    enabledSpecies: ctx.ranch.enabledSpecies,
  });
  const actions = summary.attention.filter((a) => a.tone === "action");
  const notes = summary.attention.filter((a) => a.tone === "info");

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl">Dashboard</h1>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/animals/new" className={buttonClasses("primary")}>
            Add Animal
          </Link>
          <Link href="/admin/updates/new" className={buttonClasses("secondary")}>
            New Post
          </Link>
        </div>
      </header>

      {query.password === "set" ? <FormMessage tone="success">Your password is saved.</FormMessage> : null}

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          On your website
        </h2>
        <ul className="grid grid-cols-2 gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-4">
          {summary.stats.map((s) => (
            <li key={s.label} className="bg-paper">
              <Link href={s.href} className="block px-5 py-5 no-underline hover:bg-surface">
                <span className="block font-display text-3xl">{s.value}</span>
                <span className="text-sm text-ink-muted">{s.label} on your website</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="font-display text-2xl">
          {actions.length ? "Needs your attention" : "You're all caught up"}
        </h2>
        {actions.length ? (
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {actions.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="flex min-h-14 items-center justify-between gap-4 py-3 no-underline hover:bg-surface"
                >
                  <span>{a.message}</span>
                  <span aria-hidden="true" className="text-accent">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ink-muted">Nothing on your website needs fixing right now.</p>
        )}
        {notes.length ? (
          <ul className="mt-6 space-y-2 text-sm text-ink-muted">
            {notes.map((n) => (
              <li key={n.id}>
                <Link href={n.href} className="underline decoration-rule underline-offset-4 hover:decoration-accent">
                  {n.message}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
