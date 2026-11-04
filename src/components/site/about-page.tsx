import Link from "next/link";
import { RichText } from "@/lib/content/rich-text";
import { richTextIsEmpty } from "@/lib/content/empty";
import type { AboutPageData } from "@/lib/site/get-about";
import { aboutIsEmpty, itemFilled, safeButtonHref, type AboutContent } from "@/lib/site/about";
import { AboutIconView } from "./about-icon";

type Photo = AboutPageData["photos"][string];

function Picture({ photo, className }: { photo: Photo; className?: string }) {
  if (!photo) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.src}
      srcSet={photo.srcSet || undefined}
      sizes="(min-width: 1024px) 40vw, 100vw"
      alt={photo.alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ objectPosition: `${photo.focalX * 100}% ${photo.focalY * 100}%` }}
    />
  );
}

/**
 * The About page below its banner: an introduction, up to three highlights, the ranch's story, up to
 * four values and a photograph across the bottom. Only what the owner filled in is shown.
 */
export function AboutSections({
  data,
  ranchName,
  mark,
  fallbackIntro,
}: {
  data: AboutPageData;
  ranchName: string;
  mark: string | null;
  /** The ranch profile's intro, shown when the About page itself is still empty. */
  fallbackIntro: unknown;
}) {
  const { content: c, photos } = data;

  if (aboutIsEmpty(c)) {
    return richTextIsEmpty(fallbackIntro) ? (
      <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-16">
        <p className="max-w-xl text-ink-muted">More about {ranchName} is coming soon.</p>
      </div>
    ) : (
      <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-16">
        <RichText doc={fallbackIntro} className="prose-ranch max-w-[44rem] text-ink-muted" />
      </div>
    );
  }

  const highlights = c.highlights.filter(itemFilled);
  const values = c.values.filter(itemFilled);
  const introPhoto = c.intro.mediaId ? photos[c.intro.mediaId] : null;
  const storyPhoto = c.story.mediaId ? photos[c.story.mediaId] : null;
  const bandPhoto = c.bandMediaId ? photos[c.bandMediaId] : null;
  const hasIntro = c.intro.heading.trim() || !richTextIsEmpty(c.intro.body) || introPhoto || (c.intro.showMark && mark);
  const storyHref = safeButtonHref(c.story.buttonHref);
  const hasStory = c.story.heading.trim() || !richTextIsEmpty(c.story.body) || storyPhoto;

  return (
    <div className="mx-auto max-w-[88rem] space-y-16 px-[var(--gutter)] py-12 lg:space-y-20 lg:py-16">
      {hasIntro ? (
        <section
          aria-label={c.intro.heading.trim() || `About ${ranchName}`}
          className="grid items-center gap-8 lg:grid-cols-[minmax(0,12rem)_1px_minmax(0,1fr)_minmax(0,22rem)] lg:gap-10"
        >
          {c.intro.showMark && mark ? (
            <p aria-hidden="true" className="font-display text-7xl leading-none text-primary lg:text-8xl">
              {mark}
            </p>
          ) : (
            <span className="hidden lg:block" />
          )}
          <span aria-hidden="true" className="hidden h-full min-h-24 bg-rule lg:block" />
          <div className="space-y-4">
            {c.intro.heading.trim() ? (
              <h2 className="font-serif text-2xl italic text-primary sm:text-3xl">{c.intro.heading}</h2>
            ) : null}
            <RichText doc={c.intro.body} className="prose-ranch text-ink-muted" />
          </div>
          <Picture photo={introPhoto} className="aspect-[4/3] w-full object-cover" />
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <ul className="grid gap-8 border-y border-rule py-10 sm:grid-cols-3">
          {highlights.map((h, i) => (
            <li
              key={i}
              className="flex flex-col items-center gap-2 text-center sm:border-l sm:border-rule sm:px-6 sm:first:border-l-0"
            >
              {h.icon ? <AboutIconView icon={h.icon} className="size-10 text-primary" /> : null}
              {h.title.trim() ? <h3 className="font-display text-xl">{h.title}</h3> : null}
              {h.text.trim() ? <p className="max-w-[30ch] text-sm text-ink-muted">{h.text}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {hasStory ? (
        <section
          aria-label={c.story.heading.trim() || "Our story"}
          className={storyPhoto ? "grid items-center gap-8 lg:grid-cols-2 lg:gap-14" : "max-w-[48rem]"}
        >
          <Picture photo={storyPhoto} className="aspect-[4/3] w-full object-cover" />
          <div className="space-y-5">
            {c.story.heading.trim() ? <h2 className="font-display text-3xl">{c.story.heading}</h2> : null}
            <RichText doc={c.story.body} className="prose-ranch text-ink-muted" />
            {c.story.buttonLabel.trim() && storyHref ? (
              <Link
                href={storyHref}
                className="inline-flex min-h-12 items-center gap-3 bg-primary px-6 py-3 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-on-primary no-underline hover:bg-[color-mix(in_oklab,var(--c-primary)_80%,white)]"
              >
                {c.story.buttonLabel}
                <svg
                  viewBox="0 0 16 16"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M2 8h11M9 4l4 4-4 4" />
                </svg>
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {values.length > 0 ? (
        <section aria-label={c.valuesHeading.trim() || "Our values"} className="space-y-8">
          {c.valuesHeading.trim() ? (
            <div className="flex items-center gap-6">
              <span aria-hidden="true" className="h-px flex-1 bg-rule" />
              <h2 className="font-display text-3xl">{c.valuesHeading}</h2>
              <span aria-hidden="true" className="h-px flex-1 bg-rule" />
            </div>
          ) : null}
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <li
                key={i}
                className="flex flex-col items-center gap-2 text-center lg:border-l lg:border-rule lg:px-4 lg:first:border-l-0"
              >
                {v.icon ? <AboutIconView icon={v.icon} className="size-9 text-primary" /> : null}
                {v.title.trim() ? <h3 className="font-display text-xl">{v.title}</h3> : null}
                {v.text.trim() ? <p className="max-w-[26ch] text-sm text-ink-muted">{v.text}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {bandPhoto ? (
        <Picture
          photo={bandPhoto}
          className="-mx-[var(--gutter)] h-40 w-[calc(100%+2*var(--gutter))] max-w-none object-cover sm:h-56 lg:h-72"
        />
      ) : null}
    </div>
  );
}

export type { AboutContent };
