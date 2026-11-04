import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadLaunch } from "@/lib/admin/launch/service";
import { canGoLive } from "@/lib/admin/launch/checks";
import { GoLiveButton } from "@/components/admin/launch/go-live-button";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Launch" };

export default function LaunchPage({ params }: PageProps<"/admin/[ranch]/launch">) {
  return (
    <Suspense fallback={null}>
      <Launch params={params} />
    </Suspense>
  );
}

async function Launch({ params }: { params: PageProps<"/admin/[ranch]/launch">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await loadLaunch(await createServerSupabase(), ctx.ranch.id);
  if (!result.ok) return <FormMessage>{result.message}</FormMessage>;
  const { checks, live } = result.data;
  const done = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Launch</h1>
        <p className="max-w-[62ch] text-ink-muted">
          {live
            ? "Your website is live and open to search engines."
            : "Until you go live, only people with the link can see your site, search engines are kept out, and a “Preview site” bar shows at the top."}
        </p>
        <p className="text-sm font-semibold">
          {done} of {checks.length} done
        </p>
      </header>

      <ul className="divide-y divide-rule border-y border-rule">
        {checks.map((c) => (
          <li key={c.key} className="flex flex-wrap items-start gap-4 py-4">
            <span
              aria-hidden="true"
              className={
                c.ok
                  ? "mt-0.5 grid size-6 shrink-0 place-items-center bg-primary text-on-primary"
                  : "mt-0.5 grid size-6 shrink-0 place-items-center border border-rule"
              }
            >
              {c.ok ? "✓" : ""}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {c.label}
                <span className="sr-only">{c.ok ? ": done" : ": not done"}</span>
                {!c.ok && c.required ? (
                  <span className="ml-3 bg-accent/15 px-2 py-0.5 align-middle text-[0.6875rem] font-semibold uppercase tracking-[0.14em]">
                    Needed to go live
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-ink-muted">{c.detail}</p>
            </div>
            {!c.ok ? (
              <Link
                href={c.href}
                className="text-sm font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
              >
                Fix this
              </Link>
            ) : null}
          </li>
        ))}
      </ul>

      {live ? null : <GoLiveButton disabled={!canGoLive(checks)} isOwner={ctx.ranch.role === "owner"} />}
    </div>
  );
}
