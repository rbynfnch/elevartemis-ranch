import type { HeroSlideData } from "@/lib/site/get-home";

/**
 * The top of the For Sale page: one of the ranch's own homepage photographs under
 * the page's title and the ranch's own tagline. With no photo yet it is the brand
 * color, never a stock picture.
 */
export function ForSaleHero({
  title,
  tagline,
  photo,
}: {
  title: string;
  tagline: string | null;
  photo: HeroSlideData["photo"];
}) {
  return (
    <section className="relative isolate overflow-hidden bg-night text-on-night">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.src}
          srcSet={photo.srcSet || undefined}
          sizes="100vw"
          alt=""
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
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-night/80 via-night/45 to-night/10"
      />
      <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-12 sm:py-16 lg:py-20">
        <p className="flex items-center gap-4 text-[0.75rem] font-semibold uppercase tracking-[0.3em] text-on-night/85">
          For Sale <span aria-hidden="true" className="h-px w-10 bg-accent" />
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-3xl sm:text-5xl">{title}</h1>
        {tagline ? (
          <p className="mt-4 max-w-[46ch] font-serif text-lg italic text-on-night/90 sm:text-xl">{tagline}</p>
        ) : null}
      </div>
    </section>
  );
}
