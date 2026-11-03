"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { LibraryPhoto } from "@/lib/admin/library/service";
import { buttonClasses } from "@/components/ui/button";

const fileSize = (bytes: number | null) =>
  bytes === null
    ? null
    : bytes >= 1_000_000
      ? `${(bytes / 1_000_000).toFixed(1)} MB`
      : `${Math.round(bytes / 1000)} KB`;

/**
 * A larger look at one photo, so it can be named, culled or assigned with
 * confidence. Arrow keys (or the buttons) move through the photos on the
 * current page; Escape closes it.
 */
export function PhotoViewer({
  photos,
  index,
  categoryLabel,
  onIndex,
  onClose,
}: {
  photos: LibraryPhoto[];
  /** Position in `photos`, or -1 when closed. */
  index: number;
  categoryLabel: (p: LibraryPhoto) => string | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const open = index >= 0 && index < photos.length;
  const photo = open ? photos[index] : null;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      else if (e.key === "ArrowRight" && index < photos.length - 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, photos.length, onIndex]);

  const category = photo ? categoryLabel(photo) : null;
  const details = photo
    ? [
        photo.width && photo.height ? `${photo.width} × ${photo.height} px` : null,
        fileSize(photo.bytes),
        `Added ${new Date(photo.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`,
      ].filter(Boolean)
    : [];

  return (
    <dialog
      ref={dialog}
      aria-labelledby="photo-viewer-title"
      onClose={onClose}
      className="m-auto h-[min(52rem,calc(100dvh-2rem))] w-[min(70rem,calc(100vw-2rem))] border border-rule bg-paper p-0 text-ink backdrop:bg-night/80"
    >
      {photo ? (
        <div className="grid h-full grid-rows-[1fr_auto] lg:grid-cols-[1fr_20rem] lg:grid-rows-1">
          <div className="relative flex min-h-0 items-center justify-center bg-night">
            {(photo.large ?? photo.thumb) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.large ?? photo.thumb ?? undefined}
                alt={photo.fileName ?? "Photo"}
                className="max-h-full max-w-full object-contain"
              />
            ) : null}
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => onIndex(index - 1)}
              disabled={index <= 0}
              className="absolute left-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center bg-night/60 text-white hover:bg-night/80 disabled:opacity-30"
            >
              <Chevron direction="left" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => onIndex(index + 1)}
              disabled={index >= photos.length - 1}
              className="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center bg-night/60 text-white hover:bg-night/80 disabled:opacity-30"
            >
              <Chevron direction="right" />
            </button>
          </div>

          <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 id="photo-viewer-title" className="break-all font-display text-xl">
                {photo.fileName ?? "Untitled photo"}
              </h3>
              <button type="button" className={buttonClasses("quiet", "shrink-0")} onClick={onClose}>
                Close
              </button>
            </div>
            <p className="text-sm text-ink-muted">
              Photo {index + 1} of {photos.length} on this page
            </p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold">Category</dt>
                <dd className="text-ink-muted">{category ?? "None"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Assigned to</dt>
                <dd className="text-ink-muted">
                  {photo.animals.length ? (
                    <ul className="space-y-1">
                      {photo.animals.map((a) => (
                        <li key={a.id}>
                          <Link
                            href={`/admin/animals/${a.id}`}
                            className="text-primary underline decoration-accent underline-offset-4"
                          >
                            {a.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : photo.usedElsewhere ? (
                    "Used on the website"
                  ) : (
                    "Unassigned"
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Details</dt>
                <dd className="text-ink-muted">{details.join(" · ")}</dd>
              </div>
            </dl>
            <p className="mt-auto text-xs text-ink-muted">Use the arrow keys to move between photos.</p>
          </aside>
        </div>
      ) : null}
    </dialog>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
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
      <path d={direction === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
    </svg>
  );
}
