import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { listAuthors, listPosts, postCounts, getTaxonomy, type PostFilters } from "@/lib/admin/blog/service";
import { newPostAction } from "@/lib/admin/blog/actions";
import { formatWhen, type PostStatus } from "@/lib/blog/schedule";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { EmptyTrashButton, RowActions } from "@/components/admin/blog/row-actions";

export const metadata: Metadata = { title: "Happening on the Ranch" };

export default function UpdatesPage({ params, searchParams }: PageProps<"/admin/[ranch]/updates">) {
  return (
    <Suspense fallback={null}>
      <Updates params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const TABS: { id: PostFilters["status"]; label: string; key: "all" | "draft" | "scheduled" | "published" | "archived" | "trash" }[] = [
  { id: "all", label: "All", key: "all" },
  { id: "published", label: "Published", key: "published" },
  { id: "scheduled", label: "Scheduled", key: "scheduled" },
  { id: "draft", label: "Drafts", key: "draft" },
  { id: "archived", label: "Archived", key: "archived" },
  { id: "trash", label: "Trash", key: "trash" },
];

const badge: Record<PostStatus, string> = {
  published: "bg-primary text-on-primary",
  scheduled: "bg-accent/20 text-ink border border-accent",
  draft: "border border-rule text-ink-muted",
  archived: "border border-rule text-ink-muted",
};
const badgeLabel: Record<PostStatus, string> = { published: "Published", scheduled: "Scheduled", draft: "Draft", archived: "Archived" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Updates({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/[ranch]/updates">["params"];
  searchParams: PageProps<"/admin/[ranch]/updates">["searchParams"];
}) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const sp = await searchParams;
  const status = (TABS.find((t) => t.id === one(sp.status))?.id ?? "all") as NonNullable<PostFilters["status"]>;
  const filters: PostFilters = {
    status,
    q: one(sp.q),
    categoryId: one(sp.category) || undefined,
    author: one(sp.author) || undefined,
    from: one(sp.from) || undefined,
    to: one(sp.to) || undefined,
    page: Number(one(sp.page)) || 1,
  };
  const db = await createServerSupabase();
  const [result, counts, authors, taxonomy, tz] = await Promise.all([
    listPosts(db, ctx.ranch.id, filters),
    postCounts(db, ctx.ranch.id),
    listAuthors(db, ctx.ranch.id),
    getTaxonomy(db, ctx.ranch.id),
    db.from("ranch_profile").select("time_zone").eq("ranch_id", ctx.ranch.id).maybeSingle(),
  ]);
  const zone = tz.data?.time_zone ?? "America/Denver";
  const data = result.ok ? result.data : { posts: [], total: 0, page: 1, pages: 1 };
  const filtered = Boolean(filters.q || filters.categoryId || filters.author || filters.from || filters.to);

  const href = (patch: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const base: Record<string, string | number | undefined> = {
      status: status === "all" ? undefined : status,
      q: filters.q,
      category: filters.categoryId,
      author: filters.author,
      from: filters.from,
      to: filters.to,
      ...patch,
    };
    for (const [k, v] of Object.entries(base)) if (v !== undefined && v !== "" && v !== 1) q.set(k, String(v));
    const s = q.toString();
    return `/admin/updates${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl">Happening on the Ranch</h1>
          <p className="max-w-[62ch] text-ink-muted">
            Stories about ranch life: new foals, moving cattle, shows and projects. Write now, schedule for later, or add older stories with an earlier date.
          </p>
        </div>
        <form action={newPostAction}>
          <button className={buttonClasses("primary")}>New post</button>
        </form>
      </header>

      <nav aria-label="Post status" className="flex flex-wrap gap-1 border-b border-rule">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={href({ status: t.id === "all" ? undefined : t.id, page: 1 })}
            aria-current={status === t.id ? "page" : undefined}
            className={`-mb-px min-h-11 border-b-2 px-3 py-2.5 text-sm no-underline ${status === t.id ? "border-primary font-semibold text-primary" : "border-transparent text-ink-muted hover:text-ink"}`}
          >
            {t.label} <span className="text-ink-muted">({counts[t.key]})</span>
          </Link>
        ))}
      </nav>

      <form method="get" action="/admin/updates" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
        <div>
          <label htmlFor="f-q" className="block text-sm font-semibold">Search</label>
          <input id="f-q" name="q" type="search" defaultValue={filters.q} placeholder="Title or words" className="block min-h-11 w-full border border-rule bg-white px-3" />
        </div>
        <div>
          <label htmlFor="f-cat" className="block text-sm font-semibold">Category</label>
          <select id="f-cat" name="category" defaultValue={filters.categoryId ?? ""} className="block min-h-11 w-full border border-rule bg-white px-2">
            <option value="">All</option>
            {taxonomy.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-author" className="block text-sm font-semibold">Author</label>
          <select id="f-author" name="author" defaultValue={filters.author ?? ""} className="block min-h-11 w-full border border-rule bg-white px-2">
            <option value="">Anyone</option>
            {authors.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-from" className="block text-sm font-semibold">Edited from</label>
          <input id="f-from" name="from" type="date" defaultValue={filters.from} className="block min-h-11 w-full border border-rule bg-white px-2" />
        </div>
        <div>
          <label htmlFor="f-to" className="block text-sm font-semibold">to</label>
          <input id="f-to" name="to" type="date" defaultValue={filters.to} className="block min-h-11 w-full border border-rule bg-white px-2" />
        </div>
        <div className="flex items-end gap-2">
          <button className={buttonClasses("secondary", "py-2")}>Filter</button>
          {filtered ? <Link href={href({ q: undefined, category: undefined, author: undefined, from: undefined, to: undefined, page: 1 })} className="min-h-11 content-center px-2 text-sm underline">Clear</Link> : null}
        </div>
      </form>

      {!result.ok ? <FormMessage>{result.message}</FormMessage> : null}
      {status === "trash" && counts.trash > 0 ? <EmptyTrashButton count={counts.trash} /> : null}

      {result.ok && data.posts.length === 0 ? (
        <div className="space-y-2 border border-dashed border-rule p-8 text-center">
          <p className="font-display text-xl">{filtered ? "No posts match." : status === "all" ? "No posts yet." : "Nothing here."}</p>
          <p className="text-ink-muted">{filtered ? "Try fewer filters." : status === "all" ? "Write your first story about life on the ranch." : "Posts will appear here when they match."}</p>
        </div>
      ) : null}

      <ul className="divide-y divide-rule border-y border-rule">
        {data.posts.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-4 py-3">
            {p.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.thumb} alt="" className="h-16 w-24 shrink-0 object-cover" />
            ) : (
              <span className="h-16 w-24 shrink-0 bg-surface" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1 basis-64 space-y-1">
              <p className="truncate font-display text-lg leading-tight">
                {p.deletedAt ? p.title : <Link href={`/admin/updates/${p.id}`} className="no-underline hover:underline">{p.title}</Link>}
              </p>
              <p className="text-sm text-ink-muted">
                {[p.categoryName, p.author, p.publishedAt ? formatWhen(p.publishedAt, zone) : `Edited ${formatWhen(p.updatedAt, zone)}`].filter(Boolean).join(" · ")}
              </p>
              <RowActions id={p.id} title={p.title} status={p.status} slug={p.slug} trashed={Boolean(p.deletedAt)} />
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] ${badge[p.status]}`}>{badgeLabel[p.status]}</span>
              {p.hasWorkingCopy ? <span className="text-xs text-ink-muted">edits waiting</span> : null}
            </div>
          </li>
        ))}
      </ul>

      {data.pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm">
          {data.page > 1 ? <Link href={href({ page: data.page - 1 })}>← Newer</Link> : <span />}
          <span className="text-ink-muted">Page {data.page} of {data.pages}</span>
          {data.page < data.pages ? <Link href={href({ page: data.page + 1 })}>Older →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
