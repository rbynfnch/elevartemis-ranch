"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { GalleryPhoto } from "@/lib/animals/get-animal";

/**
 * The animal's photographs: one large picture with a strip of thumbnails
 * beneath, and a full-screen view with arrow-key navigation. Each photo is
 * cropped around the owner's chosen focal point.
 */
export function PhotoGallery({ photos, name }: { photos: GalleryPhoto[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const count = photos.length;
  const photo = photos[index];
  const alt = (p: GalleryPhoto, i: number) => p.alt ?? `${name}, photo ${i + 1} of ${count}`;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(count - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, count]);

  if (!photo) return null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${name} photos full screen`}
        className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-surface"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          srcSet={photo.srcSet || undefined}
          sizes="(min-width: 1024px) 55vw, 100vw"
          alt={alt(photo, index)}
          fetchPriority={index === 0 ? "high" : "auto"}
          decoding="async"
          className="size-full object-cover"
          style={{ objectPosition: `${photo.focalX * 100}% ${photo.focalY * 100}%` }}
        />
        <span
          aria-hidden="true"
          className="absolute bottom-3 right-3 inline-flex items-center gap-2 bg-night/70 px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-on-night opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {count > 1 ? `${index + 1} / ${count}` : "Enlarge"}
        </span>
      </button>

      {count > 1 ? (
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {photos.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                aria-label={`Show photo ${i + 1} of ${count}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={clsx(
                  "block aspect-square w-full overflow-hidden bg-surface outline-offset-2",
                  i === index ? "ring-2 ring-primary ring-offset-2 ring-offset-paper" : "opacity-80 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumb}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                  style={{ objectPosition: `${p.focalX * 100}% ${p.focalY * 100}%` }}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <dialog
        ref={dialog}
        aria-label={`${name} photos`}
        onClose={() => setOpen(false)}
        className="m-0 h-dvh max-h-none w-dvw max-w-none border-0 bg-night/95 p-0 text-on-night backdrop:bg-night"
      >
        <div className="relative flex size-full items-center justify-center p-4 sm:p-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.large} alt={alt(photo, index)} className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex size-11 items-center justify-center bg-night/70 hover:bg-night"
          >
            <Icon path="M6 6l12 12M18 6 6 18" />
          </button>
          {count > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                disabled={index === 0}
                onClick={() => setIndex(index - 1)}
                className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center bg-night/70 hover:bg-night disabled:opacity-30"
              >
                <Icon path="m15 5-7 7 7 7" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                disabled={index === count - 1}
                onClick={() => setIndex(index + 1)}
                className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center bg-night/70 hover:bg-night disabled:opacity-30"
              >
                <Icon path="m9 5 7 7-7 7" />
              </button>
              <p
                className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-night/70 px-3 py-1 text-sm"
                aria-live="polite"
              >
                {index + 1} of {count}
              </p>
            </>
          ) : null}
        </div>
      </dialog>
    </div>
  );
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
