import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { listPosts } from "@/lib/admin/posts/service";
import { newPostAction } from "@/lib/admin/posts/actions";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Happening on the Ranch" };

export default function UpdatesPage({ params }: PageProps<"/admin/[ranch]/updates">) {
  return (
    <Suspense fallback={null}>
      <Updates params={params} />
    </Suspense>
  );
}

const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : "";

async function Updates({ params }: { params: PageProps<"/admin/[ranch]/updates">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await listPosts(await createServerSupabase(), ctx.ranch.id);
  const posts = result.ok ? result.data : [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl">Happening on the Ranch</h1>
          <p className="max-w-[62ch] text-ink-muted">
            Stories about ranch life: new foals, moving cattle, shows and projects. Change a post&apos;s date to add
            older stories and build your ranch&apos;s history.
          </p>
        </div>
        <form action={newPostAction}>
          <button className={buttonClasses("primary")}>Write a post</button>
        </form>
      </header>
      {!result.ok ? <FormMessage>{result.message}</FormMessage> : null}
      {result.ok && posts.length === 0 ? <p className="text-ink-muted">No posts yet. Write your first one.</p> : null}
      <ul className="divide-y divide-rule border-y border-rule">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              href={`/admin/updates/${p.id}`}
              className="flex items-center gap-4 py-3 no-underline hover:bg-surface"
            >
              {p.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumb} alt="" className="h-16 w-24 shrink-0 object-cover" />
              ) : (
                <span className="h-16 w-24 shrink-0 bg-surface" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg leading-tight">{p.title}</p>
                <p className="text-sm text-ink-muted">
                  {[p.categoryName, date(p.publishedAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span
                className={
                  p.status === "published"
                    ? "bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-on-primary"
                    : "border border-rule px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-muted"
                }
              >
                {p.status === "published" ? "Published" : "Draft"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
