import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import clsx from "clsx";
import { getSiteSettings } from "@/lib/site/get-site";
import { getPageHero } from "@/lib/site/page-hero";
import { getPostCategories, getPosts, type PostCard } from "@/lib/site/get-posts";
import { PageHero } from "@/components/site/page-hero";
import { PostCardView } from "@/components/site/post-card";

type Params = PageProps<"/site/[ranch]/on-the-ranch">["params"];
type Search = PageProps<"/site/[ranch]/on-the-ranch">["searchParams"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) return {};
  const label = site.blogLabel ?? "Happening on the Ranch";
  return {
    title: label,
    description: `News, stories and experiences from ${site.name}.`,
    alternates: { canonical: "/on-the-ranch" },
  };
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
  const category =
    typeof (await searchParams).category === "string" ? ((await searchParams).category as string) : undefined;

  const [posts, categories, hero] = await Promise.all([
    getPosts(site.ranchId, site.slug, category),
    getPostCategories(site.ranchId, site.slug),
    getPageHero(site, "on-the-ranch", { title: label }),
  ]);
  const active = categories.find((c) => c.slug === category);

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
                  href={c.slug ? `/on-the-ranch?category=${c.slug}` : "/on-the-ranch"}
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
      </div>
    </>
  );
}
