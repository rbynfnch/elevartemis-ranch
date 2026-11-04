import Link from "next/link";
import { RichText } from "@/lib/content/rich-text";
import type { PostPage } from "@/lib/site/get-posts";
import { AnimalGrid } from "@/components/animals/listing";
import { PostCardView, postDate } from "@/components/site/post-card";

/**
 * A blog post as visitors read it. Used by the live page and by the owner's preview, so the preview is the real thing.
 */
export function PostArticle({
  post,
  siteName,
  label,
  brandMark,
}: {
  post: PostPage;
  siteName: string;
  label: string;
  brandMark?: string | null;
}) {
  const meta = [post.category?.name, postDate(post.publishedAt)].filter(Boolean).join(" · ");
  return (
    <article className="mx-auto max-w-[88rem] px-[var(--gutter)] py-10 lg:py-14">
      <nav aria-label="Breadcrumb" className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">
        <Link href="/on-the-ranch" className="no-underline hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4">
          {label}
        </Link>
      </nav>

      <header className="mx-auto mt-6 max-w-[48rem] space-y-4 text-center">
        {meta ? <p className="text-[0.75rem] font-semibold uppercase tracking-[0.25em] text-ink-muted">{meta}</p> : null}
        <h1 className="font-display text-4xl sm:text-5xl">{post.title}</h1>
        {post.excerpt ? <p className="font-serif text-xl italic text-ink-muted">{post.excerpt}</p> : null}
        <p className="text-sm text-ink-muted">
          {[post.authorName ? `By ${post.authorName}` : null, `${post.minutes} min read`].filter(Boolean).join(" · ")}
        </p>
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

      <RichText doc={post.body} photos={post.bodyPhotos} className="prose-ranch mx-auto mt-10 max-w-[44rem] flow-root" />

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

      {post.tags.length > 0 ? (
        <ul aria-label="Tags" className="mx-auto mt-10 flex max-w-[44rem] flex-wrap gap-2">
          {post.tags.map((t) => (
            <li key={t.slug}>
              <Link href={`/on-the-ranch?tag=${t.slug}`} className="inline-flex min-h-9 items-center border border-rule px-3 text-sm no-underline hover:bg-surface">
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {post.animals.length > 0 ? (
        <section aria-labelledby="in-story" className="mt-16 space-y-6 border-t border-rule pt-10">
          <h2 id="in-story" className="font-display text-2xl">
            In this story
          </h2>
          <AnimalGrid animals={post.animals} brandMark={brandMark} />
        </section>
      ) : null}

      {post.related.length > 0 ? (
        <section aria-labelledby="more-stories" className="mt-16 space-y-6 border-t border-rule pt-10">
          <h2 id="more-stories" className="font-display text-2xl">
            More from {label}
          </h2>
          <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {post.related.map((r) => (
              <li key={r.id}>
                <PostCardView post={r} brandMark={brandMark} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mx-auto mt-16 max-w-[44rem] space-y-8 border-t border-rule pt-8">
        <p className="text-ink-muted">
          Questions about {siteName}, or about an animal you saw here?{" "}
          <Link href="/contact" className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4">
            Get in touch
          </Link>
          .
        </p>
        <nav aria-label="More posts" className="grid gap-4 sm:grid-cols-2">
          {post.previous ? (
            <Link href={`/on-the-ranch/${post.previous.slug}`} className="block border border-rule p-4 no-underline hover:bg-surface">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">Earlier</span>
              <span className="mt-1 block font-display text-lg">{post.previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {post.next ? (
            <Link href={`/on-the-ranch/${post.next.slug}`} className="block border border-rule p-4 text-right no-underline hover:bg-surface">
              <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">Newer</span>
              <span className="mt-1 block font-display text-lg">{post.next.title}</span>
            </Link>
          ) : null}
        </nav>
      </footer>
    </article>
  );
}
