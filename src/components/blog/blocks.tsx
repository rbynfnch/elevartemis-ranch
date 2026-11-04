import Link from "next/link";
import type { ReactNode } from "react";
import clsx from "clsx";
import { aspectRatio, cropStyles } from "@/lib/blog/crop";
import { ASPECTS, IMAGE_LAYOUTS, isId, safeLink, type Aspect } from "@/lib/blog/content";
import { embedSrc } from "@/lib/blog/video";
import type { TextPhotos } from "@/lib/content/rich-text";
import { GalleryView } from "./gallery-view";
import { resolveTextPhoto } from "./resolve-photo";

type Attrs = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");
const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : d;
const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

const toneClass = {
  info: "border-primary bg-primary/5",
  tip: "border-accent bg-accent/10",
  warning: "border-[#8a2b1d] bg-[#8a2b1d]/5",
} as const;

/** A single photo: placed in the text, wide, or floated left or right, shown in the chosen shape, with caption and link. */
export function ImageBlock({ attrs, photos }: { attrs: Attrs; photos?: TextPhotos }) {
  const photo = resolveTextPhoto(attrs.mediaId, attrs.thumb, photos);
  if (!photo) return null;
  const layout = pick(attrs.layout, IMAGE_LAYOUTS, "normal");
  const aspect = pick(attrs.aspect, ASPECTS, "original") as Aspect;
  const view = cropStyles({
    aspect,
    zoom: n(attrs.zoom, 1),
    focalX: n(attrs.focalX, 0.5),
    focalY: n(attrs.focalY, 0.5),
  });
  const caption = s(attrs.caption).trim();
  const alt = s(attrs.alt).trim() || photo.alt;
  const href = safeLink(attrs.href);
  const external = href ? /^https?:/i.test(href) : false;
  const img = (
    <div style={view.frame} className="bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        srcSet={photo.srcSet || undefined}
        sizes={
          layout === "wide"
            ? "(min-width: 1024px) 60rem, 100vw"
            : layout === "normal"
              ? "(min-width: 768px) 44rem, 100vw"
              : "(min-width: 768px) 22rem, 100vw"
        }
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-auto w-full"
        style={view.img}
      />
    </div>
  );
  return (
    <figure
      className={clsx(
        layout === "wide" && "my-10 lg:-mx-12",
        layout === "normal" && "my-8",
        layout === "left" && "my-6 md:float-left md:mb-4 md:mr-8 md:mt-2 md:w-[46%]",
        layout === "right" && "my-6 md:float-right md:mb-4 md:ml-8 md:mt-2 md:w-[46%]",
      )}
    >
      {href ? (
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="block no-underline"
        >
          {img}
        </a>
      ) : (
        img
      )}
      {caption ? <figcaption className="mt-2 text-sm italic text-ink-muted">{caption}</figcaption> : null}
    </figure>
  );
}

export function GalleryBlock({ attrs, photos }: { attrs: Attrs; photos?: TextPhotos }) {
  const items = (Array.isArray(attrs.items) ? attrs.items : []) as Attrs[];
  const shown = items
    .map((it) => {
      const p = resolveTextPhoto(it.mediaId, it.thumb, photos);
      return p ? { src: p.src, srcSet: p.srcSet, alt: s(it.alt).trim() || p.alt, caption: s(it.caption).trim() } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  if (shown.length === 0) return null;
  const layout = pick(attrs.layout, ["grid", "masonry", "slideshow", "pair"] as const, "grid");
  return (
    <GalleryView
      photos={shown}
      layout={layout}
      columns={Math.round(n(attrs.columns, 3))}
      aspect={aspectRatio(pick(attrs.aspect, ASPECTS, "original") as Aspect)}
    />
  );
}

export function VideoBlock({ attrs }: { attrs: Attrs }) {
  const provider = attrs.provider === "vimeo" ? "vimeo" : attrs.provider === "youtube" ? "youtube" : null;
  const id = typeof attrs.videoId === "string" && /^[A-Za-z0-9_-]{3,40}$/.test(attrs.videoId) ? attrs.videoId : null;
  if (!provider || !id) return null;
  const caption = s(attrs.caption).trim();
  return (
    <figure data-clear className="my-10">
      <div className="relative aspect-video w-full overflow-hidden bg-night">
        <iframe
          src={embedSrc(provider, id)}
          title={caption || "Video"}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      </div>
      {caption ? <figcaption className="mt-2 text-sm italic text-ink-muted">{caption}</figcaption> : null}
    </figure>
  );
}

/** A call to action: heading, a few words, a brand button and an optional picture. */
export function CtaBlock({ attrs, photos }: { attrs: Attrs; photos?: TextPhotos }) {
  const href = safeLink(attrs.href);
  const label = s(attrs.label).trim();
  if (!href || !label) return null;
  const photo = isId(attrs.mediaId) ? resolveTextPhoto(attrs.mediaId, attrs.thumb, photos) : null;
  const external = /^https?:/i.test(href);
  const button =
    "inline-flex min-h-12 items-center gap-3 bg-primary px-6 py-3 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-on-primary no-underline hover:bg-[color-mix(in_oklab,var(--c-primary)_80%,white)]";
  const arrow = (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  );
  return (
    <aside
      data-clear
      className={clsx(
        "my-12 grid items-center gap-6 border border-rule bg-surface p-6 sm:p-8",
        photo && "md:grid-cols-[minmax(0,14rem)_1fr]",
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.src}
          srcSet={photo.srcSet || undefined}
          sizes="14rem"
          alt={photo.alt}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : null}
      <div className="space-y-3">
        {s(attrs.heading).trim() ? <p className="font-display text-2xl leading-tight">{s(attrs.heading)}</p> : null}
        {s(attrs.text).trim() ? <p className="text-ink-muted">{s(attrs.text)}</p> : null}
        {external ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={button}>
            {label}
            {arrow}
          </a>
        ) : (
          <Link href={href} className={button}>
            {label}
            {arrow}
          </Link>
        )}
      </div>
    </aside>
  );
}

/** The wrapper for a callout (info, tip or warning). */
export function Callout({ tone, children }: { tone: unknown; children: ReactNode }) {
  const t = pick(tone, ["info", "tip", "warning"] as const, "info");
  return (
    <aside className={clsx("my-8 border-l-4 px-5 py-4 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", toneClass[t])}>
      {children}
    </aside>
  );
}
