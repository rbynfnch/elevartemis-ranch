"use client";

import { useRef, useState } from "react";
import clsx from "clsx";

export type GalleryPhoto = { src: string; srcSet: string; alt: string; caption: string };

/**
 * A gallery on a published post: a neat grid, a masonry flow, two photos side by side, or a slideshow. Photos open
 * larger in a viewer with arrows and the keyboard. Works without scripting for the layouts; the slideshow and viewer need it.
 */
export function GalleryView({
  photos,
  layout,
  columns,
  aspect,
}: {
  photos: GalleryPhoto[];
  layout: "grid" | "masonry" | "slideshow" | "pair";
  columns: number;
  aspect?: string;
}) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const step = (by: number) => setIndex((i) => (i + by + photos.length) % photos.length);
  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const cols = layout === "pair" ? 2 : Math.min(4, Math.max(2, columns));
  const colClass =
    cols === 2 ? "sm:grid-cols-2" : cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";
  const current = photos[index];

  return (
    <div className="my-10">
      {layout === "slideshow" ? (
        <div
          role="group"
          aria-roledescription="carousel"
          aria-label="Photo slideshow"
          onKeyDown={(e) => (e.key === "ArrowRight" ? step(1) : e.key === "ArrowLeft" ? step(-1) : undefined)}
        >
          <figure className="relative">
            <button
              type="button"
              onClick={() => open(index)}
              aria-label="View this photo larger"
              className="block w-full bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.src}
                srcSet={current.srcSet || undefined}
                sizes="(min-width: 768px) 44rem, 100vw"
                alt={current.alt}
                className="mx-auto max-h-[70vh] w-full object-contain"
              />
            </button>
            {current.caption ? (
              <figcaption className="mt-2 text-sm italic text-ink-muted">{current.caption}</figcaption>
            ) : null}
          </figure>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="tabular-nums text-ink-muted" aria-live="polite">
              {index + 1} of {photos.length}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="min-h-11 min-w-11 border border-rule px-3 hover:bg-surface"
                onClick={() => step(-1)}
                aria-label="Previous photo"
              >
                ←
              </button>
              <button
                type="button"
                className="min-h-11 min-w-11 border border-rule px-3 hover:bg-surface"
                onClick={() => step(1)}
                aria-label="Next photo"
              >
                →
              </button>
            </span>
          </div>
        </div>
      ) : (
        <ul
          className={clsx(
            layout === "masonry" ? "columns-2 gap-3 md:columns-3" : clsx("grid grid-cols-2 gap-3", colClass),
          )}
        >
          {photos.map((p, i) => (
            <li key={`${p.src}-${i}`} className={clsx(layout === "masonry" && "mb-3 break-inside-avoid")}>
              <figure>
                <button
                  type="button"
                  onClick={() => open(i)}
                  aria-label={p.alt ? `View larger: ${p.alt}` : `View photo ${i + 1} larger`}
                  className="group block w-full overflow-hidden bg-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.src}
                    srcSet={p.srcSet || undefined}
                    sizes="(min-width: 768px) 22rem, 50vw"
                    alt={p.alt}
                    loading="lazy"
                    decoding="async"
                    className={clsx(
                      "w-full transition-transform duration-700 group-hover:scale-[1.03]",
                      layout !== "masonry" && "h-full object-cover",
                    )}
                    style={layout !== "masonry" && aspect ? { aspectRatio: aspect } : undefined}
                  />
                </button>
                {p.caption ? <figcaption className="mt-1 text-sm italic text-ink-muted">{p.caption}</figcaption> : null}
              </figure>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        aria-label="Photo viewer"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(72rem,calc(100vw-1rem))] max-w-none border-0 bg-night p-0 text-on-night backdrop:bg-black/80 open:flex open:flex-col"
      >
        {current ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              srcSet={current.srcSet || undefined}
              sizes="100vw"
              alt={current.alt}
              className="max-h-[80dvh] w-full object-contain"
            />
            <div className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="min-w-0 flex-1 truncate italic opacity-90">{current.caption}</span>
              <span className="tabular-nums opacity-80">
                {index + 1} of {photos.length}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  className="min-h-11 min-w-11 border border-white/30 px-3"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="min-h-11 min-w-11 border border-white/30 px-3"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                >
                  →
                </button>
                <button
                  type="button"
                  className="min-h-11 border border-white/30 px-4"
                  onClick={() => dialog.current?.close()}
                >
                  Close
                </button>
              </span>
            </div>
          </>
        ) : null}
      </dialog>
    </div>
  );
}
