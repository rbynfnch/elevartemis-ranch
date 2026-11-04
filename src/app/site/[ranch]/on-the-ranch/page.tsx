import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import clsx from "clsx";
import { getSiteSettings } from "@/lib/site/get-site";
import { pageMetadata } from "@/lib/site/seo";
import { getPageHero } from "@/lib/site/page-hero";
import { getPostCategories, getPostList, getPostTags, type PostCard } from "@/lib/site/get-posts";
import { PageHero } from "@/components/site/page-hero";
import { PostCardView } from "@/components/site/post-card";

type Params = PageProps<"/site/[ranch]/on-the-ranch">["params"];
type Search = PageProps<"/site/[ranch]/on-the-ranch">["searchParams"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  const label = site.blogLabel ?? "Happening on the Ranch";
  return pageMetadata(site, "on-the-ranch", {
    title: label,
    description: `News, stories and experiences from ${site.name}.`,
    path: "/on-the-ranch",
  });
}

export default function OnTheRanch({ params, searchParams }: PageProps<"/site/[ranch]/on-the-ranch">) {
  return (
    <Suspense fallback={null}>
      <Page params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Page({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) notFound();
  const label = site.blogLabel ?? "Happening on the Ranch";
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const category = one(sp.category);
  const tag = one(sp.tag);
  const pageNo = Number(one(sp.page)) || 1;

  const [list, categories, tags, hero] = await Promise.all([
    getPostList(site.ranchId, site.slug, { category, tag, page: pageNo }),
    getPostCategories(site.ranchId, site.slug),
    getPostTags(site.ranchId, site.slug),
    getPageHero(site, "on-the-ranch", { title: label }),
  ]);
  const posts = list.posts;
  const active = categories.find((c) => c.slug === category);
  const activeTag = tags.find((t) => t.slug === tag);
  const link = (q: { category?: string; tag?: string; page?: number }) => {
    const p = new URLSearchParams();
    if (q.category) p.set("category", q.category);
    if (q.tag) p.set("tag", q.tag);
    if (q.page && q.page > 1) p.set("page", String(q.page));
    const str = p.toString();
    return `/on-the-ranch${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <PageHero eyebrow={site.name} title={hero.title} subtitle={hero.subtitle} photo={hero.photo} />
      <div className="mx-auto max-w-[88rem] space-y-10 px-[var(--gutter)] py-10 lg:py-14">
        {categories.length > 0 ? (
          <nav aria-label="Categories" className="flex flex-wrap gap-2">
            {[{ name: "All", slug: "" }, ...categories].map((c) => {
              const current = (c.slug || undefined) === (active?.slug || undefined);
              return (
                <Link
                  key={c.slug || "all"}
                  href={link({ category: c.slug || undefined })}
                  aria-current={current ? "page" : undefined}
                  className={clsx(
                    "inline-flex min-h-11 items-center border px-4 text-sm no-underline",
                    current ? "border-primary bg-primary text-on-primary" : "border-rule bg-white hover:bg-surface",
                  )}
                >
                  {c.name}
                </Link>
              );
            })}
          </nav>
        ) : null}
        {activeTag ? (
          <p className="text-ink-muted">
            Stories tagged <strong>{activeTag.name}</strong>.{" "}
            <Link href={link({ category })} className="text-primary underline underline-offset-4">
              Show all
            </Link>
          </p>
        ) : null}
        {posts.length === 0 ? (
          <p className="text-ink-muted">Nothing here yet. Check back soon.</p>
        ) : (
          <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p: PostCard) => (
              <li key={p.id}>
                <PostCardView post={p} brandMark={site.brand.mark} />
              </li>
            ))}
          </ul>
        )}
        {list.pages > 1 ? (
          <nav aria-label="More stories" className="flex items-center justify-between border-t border-rule pt-6 text-sm">
            {list.page > 1 ? (
              <Link href={link({ category, tag, page: list.page - 1 })} rel="prev" className="inline-flex min-h-11 items-center">
                ← Newer stories
              </Link>
            ) : (
              <span />
            )}
            <span className="text-ink-muted">
              Page {list.page} of {list.pages}
            </span>
            {list.page < list.pages ? (
              <Link href={link({ category, tag, page: list.page + 1 })} rel="next" className="inline-flex min-h-11 items-center">
                Older stories →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </>
  );
}
