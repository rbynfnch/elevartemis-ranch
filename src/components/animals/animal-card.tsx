import Link from "next/link";
import { PhotoPlaceholder } from "./photo-placeholder";

export type AnimalCardData = {
  name: string;
  href: string;
  categoryLabel: string;
  breed?: string | null;
  birthYear?: number | null;
  badge?: "For Sale" | "Sale Pending" | "Sold" | null;
  /** Shown under the details on for-sale cards. */
  price?: string | null;
  /** On the In Memory page: the animal's lifespan, shown with the breed. */
  memorial?: string | null;
  photo?: { src: string; alt: string; focalX: number; focalY: number } | null;
};

/**
 * Listing card: photograph first, then name and only the details that exist.
 * No empty lines, no placeholder dashes — a card with just a name and a
 * category is still a complete card.
 */
export function AnimalCard({ animal, brandMark }: { animal: AnimalCardData; brandMark?: string | null }) {
  const details = [animal.breed, animal.memorial ?? (animal.birthYear ? String(animal.birthYear) : null)].filter(
    (d): d is string => Boolean(d && d.trim()),
  );

  return (
    <article className="group relative">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-surface">
        {animal.photo ? (
          // Phase 5 replaces this with the responsive <RanchImage> (srcset from stored variants).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={animal.photo.src}
            alt={animal.photo.alt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]"
            style={{ objectPosition: `${animal.photo.focalX * 100}% ${animal.photo.focalY * 100}%` }}
          />
        ) : (
          <PhotoPlaceholder mark={brandMark} className="size-full" />
        )}
        {animal.badge ? (
          <span className="absolute left-3 top-3 bg-paper/95 px-2.5 py-1 font-sans text-sm font-semibold text-ink">
            {animal.badge}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-ink-muted">
        {animal.categoryLabel}
      </p>
      <h3 className="mt-1 font-display text-xl leading-tight">
        <Link href={animal.href} className="no-underline after:absolute after:inset-0">
          {animal.name}
        </Link>
      </h3>
      {details.length > 0 ? <p className="mt-1.5 text-sm text-ink-muted">{details.join(" · ")}</p> : null}
      {animal.price ? <p className="mt-1.5 font-semibold">{animal.price}</p> : null}
      <p
        className="mt-3 inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-primary"
        aria-hidden="true"
      >
        View details
        <svg viewBox="0 0 16 16" className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5">
          <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </p>
    </article>
  );
}
