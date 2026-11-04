"use client";

import { useRef, useState } from "react";
import type { GalleryItem } from "@/lib/site/get-gallery";

/** The gallery: a grid of photos; click one to see it large, then step through with the arrows or the keys. */
export function GalleryGrid({ photos }: { photos: GalleryItem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const open = (i: number) => {
    setIndex(i);
    dialog.current?.showModal();
  };
  const step = (by: number) => setIndex((i) => (i + by + photos.length) % photos.length);
  const current = photos[index];

  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 lg:columns-4">
        {photos.map((p, i) => (
          <li key={p.src} className="mb-3 break-inside-avoid">
            <button
              type="button"
              onClick={() => open(i)}
              aria-label={p.alt ? `View larger: ${p.alt}` : `View photo ${i + 1} larger`}
              className="group block w-full overflow-hidden bg-surface focus-visible:outline-2 focus-visible:outline-primary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                srcSet={p.srcSet || undefined}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                alt={p.alt}
                loading="lazy"
                decoding="async"
                className="w-full transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

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
    </>
  );
}
