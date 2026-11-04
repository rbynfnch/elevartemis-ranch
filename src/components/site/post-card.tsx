import Link from "next/link";
import type { PostCard } from "@/lib/site/get-posts";
import { PhotoPlaceholder } from "@/components/animals/photo-placeholder";

export const postDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
    : "";

/** A post on the list: photo, category and date, title and summary. The whole card is the link. */
export function PostCardView({ post, brandMark }: { post: PostCard; brandMark?: string | null }) {
  return (
    <article className="group relative">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        {post.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.photo.src}
            srcSet={post.photo.srcSet || undefined}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
            alt={post.photo.alt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]"
            style={{ objectPosition: `${post.photo.focalX * 100}% ${post.photo.focalY * 100}%` }}
          />
        ) : (
          <PhotoPlaceholder mark={brandMark} className="size-full" />
        )}
      </div>
      <p className="mt-4 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ink-muted">
        {[post.category?.name, postDate(post.publishedAt)].filter(Boolean).join(" · ")}
      </p>
      <h2 className="mt-1 font-display text-2xl leading-tight">
        <Link href={`/on-the-ranch/${post.slug}`} className="no-underline after:absolute after:inset-0">
          {post.title}
        </Link>
      </h2>
      {post.excerpt ? <p className="mt-2 text-ink-muted">{post.excerpt}</p> : null}
      <p
        aria-hidden="true"
        className="mt-3 inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-primary"
      >
        Read more
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
        </svg>
      </p>
    </article>
  );
}
