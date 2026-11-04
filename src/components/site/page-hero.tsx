import type { PageBanner } from "@/lib/site/get-banner";

/**
 * The banner at the top of a main page: a photograph under an eyebrow, a headline and a subheadline.
 * With `imageOnly` (category pages) it is just the photograph, and nothing at all when there is none.
 * With no photo the banner is the brand color, never a stock picture.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  photo,
  imageOnly,
}: {
  eyebrow?: string | null;
  title?: string;
  subtitle?: string | null;
  photo: PageBanner["photo"];
  imageOnly?: boolean;
}) {
  if (imageOnly && !photo) return null;
  return (
    <section className="relative isolate overflow-hidden bg-night text-on-night">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.src}
          srcSet={photo.srcSet || undefined}
          sizes="100vw"
          alt={imageOnly ? photo.alt : ""}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-20 size-full object-cover"
          style={{ objectPosition: `${photo.focalX * 100}% ${photo.focalY * 100}%` }}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_20%_10%,color-mix(in_oklab,var(--c-primary)_55%,var(--c-night)),var(--c-night))]"
        />
      )}
      {imageOnly ? (
        <div className="h-40 sm:h-56 lg:h-72" />
      ) : (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-r from-night/80 via-night/45 to-night/10"
          />
          <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-12 sm:py-16 lg:py-20">
            {eyebrow ? (
              <p className="flex items-center gap-4 text-[0.75rem] font-semibold uppercase tracking-[0.3em] text-on-night/85">
                {eyebrow} <span aria-hidden="true" className="h-px w-10 bg-accent" />
              </p>
            ) : null}
            <h1 className="mt-4 max-w-[20ch] font-display text-3xl sm:text-5xl">{title}</h1>
            {subtitle ? (
              <p className="mt-4 max-w-[46ch] font-serif text-lg italic text-on-night/90 sm:text-xl">{subtitle}</p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
