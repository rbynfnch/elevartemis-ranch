import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { getPost } from "@/lib/site/get-posts";
import { RichText } from "@/lib/content/rich-text";
import { plainSummary } from "@/lib/animals/portfolio";
import { AnimalGrid } from "@/components/animals/listing";
import { JsonLd } from "@/components/site/json-ld";
import { postDate } from "@/components/site/post-card";

type Params = PageProps<"/site/[ranch]/on-the-ranch/[slug]">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch, slug } = await params;
  const site = await getSiteSettings(ranch);
  const post = site ? await getPost(site.ranchId, site.slug, slug) : null;
  if (!site || !post) return {};
  const description = post.metaDescription ?? post.excerpt ?? plainSummary(post.body, 155) ?? undefined;
  return {
    title: post.metaTitle ?? post.title,
    description,
    alternates: { canonical: `/on-the-ranch/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.metaTitle ?? post.title,
      description,
      publishedTime: post.publishedAt || undefined,
      images: post.photo ? [{ url: post.photo.src }] : undefined,
    },
  };
}

export default function Post({ params }: PageProps<"/site/[ranch]/on-the-ranch/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Page params={params} />
    </Suspense>
  );
}

async function Page({ params }: { params: Params }) {
  const { ranch, slug } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) notFound();
  const post = await getPost(site.ranchId, site.slug, slug);
  if (!post) notFound();
  const label = site.blogLabel ?? "Happening on the Ranch";

  return (
    <article className="mx-auto max-w-[88rem] px-[var(--gutter)] py-10 lg:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.metaDescription ?? post.excerpt ?? plainSummary(post.body, 155) ?? undefined,
          datePublished: post.publishedAt || undefined,
          image: post.photo ? [post.photo.src] : undefined,
          author: { "@type": "Organization", name: site.name },
          publisher: { "@type": "Organization", name: site.name },
          mainEntityOfPage: `/on-the-ranch/${post.slug}`,
        }}
      />
      <nav
        aria-label="Breadcrumb"
        className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted"
      >
        <Link
          href="/on-the-ranch"
          className="no-underline hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4"
        >
          {label}
        </Link>
      </nav>

      <header className="mx-auto mt-6 max-w-[48rem] space-y-4 text-center">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-ink-muted">
          {[post.category?.name, postDate(post.publishedAt)].filter(Boolean).join(" · ")}
        </p>
        <h1 className="font-display text-4xl sm:text-5xl">{post.title}</h1>
        {post.excerpt ? <p className="font-serif text-xl italic text-ink-muted">{post.excerpt}</p> : null}
      </header>

      {post.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.photo.src}
          srcSet={post.photo.srcSet || undefined}
          sizes="(min-width: 1280px) 1200px, 100vw"
          alt={post.photo.alt}
          fetchPriority="high"
          decoding="async"
          className="mx-auto mt-10 aspect-[16/9] w-full max-w-[72rem] object-cover"
          style={{ objectPosition: `${post.photo.focalX * 100}% ${post.photo.focalY * 100}%` }}
        />
      ) : null}

      <RichText doc={post.body} photos={post.bodyPhotos} className="prose-ranch mx-auto mt-10 max-w-[44rem]" />

      {post.photos.length > 0 ? (
        <ul className="mx-auto mt-12 grid max-w-[72rem] gap-4 sm:grid-cols-2">
          {post.photos.map((p, i) => (
            <li key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                srcSet={p.srcSet || undefined}
                sizes="(min-width: 640px) 50vw, 100vw"
                alt={p.alt}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
                style={{ objectPosition: `${p.focalX * 100}% ${p.focalY * 100}%` }}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {post.animals.length > 0 ? (
        <section aria-labelledby="in-story" className="mt-16 space-y-6 border-t border-rule pt-10">
          <h2 id="in-story" className="font-display text-2xl">
            In this story
          </h2>
          <AnimalGrid animals={post.animals} brandMark={site.brand.mark} />
        </section>
      ) : null}

      <footer className="mx-auto mt-16 max-w-[44rem] space-y-8 border-t border-rule pt-8">
        <p className="text-ink-muted">
          Questions about {site.name}, or about an animal you saw here?{" "}
          <Link
            href="/contact"
            className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
          >
            Get in touch
          </Link>
          .
        </p>
        <nav aria-label="More posts" className="grid gap-4 sm:grid-cols-2">
          {post.previous ? (
            <Link
              href={`/on-the-ranch/${post.previous.slug}`}
              className="block border border-rule p-4 no-underline hover:bg-surface"
            >
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">Earlier</span>
              <span className="mt-1 block font-display text-lg">{post.previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {post.next ? (
            <Link
              href={`/on-the-ranch/${post.next.slug}`}
              className="block border border-rule p-4 text-right no-underline hover:bg-surface"
            >
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">Newer</span>
              <span className="mt-1 block font-display text-lg">{post.next.title}</span>
            </Link>
          ) : null}
        </nav>
      </footer>
    </article>
  );
}
