"use client";

import { useRef, useState } from "react";
import { listLibraryAction } from "@/lib/admin/library/actions";
import type { LibraryPhoto } from "@/lib/admin/library/service";
import { FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

/** "Choose from the Photo Library": one photo, picked by clicking it. */
export function PhotoChooser({
  label,
  onChoose,
}: {
  label: string;
  onChoose: (photo: { id: string; thumb: string | null }) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [photos, setPhotos] = useState<LibraryPhoto[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function open() {
    setError("");
    setQuery("");
    dialog.current?.showModal();
    if (photos) return;
    const result = await listLibraryAction();
    if (!result.ok) return setError(result.message);
    setPhotos(result.data);
  }

  const shown = (photos ?? []).filter(
    (p) => !query.trim() || (p.fileName ?? "").toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <button type="button" className={buttonClasses("secondary", "py-2")} onClick={open}>
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="chooser-title"
        className="m-auto flex h-[min(46rem,calc(100dvh-2rem))] w-[min(60rem,calc(100vw-2rem))] flex-col border border-rule bg-paper p-0 text-ink backdrop:bg-night/60 open:flex"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4">
          <h2 id="chooser-title" className="font-display text-xl">
            Choose a photo
          </h2>
          <div className="flex items-center gap-3">
            <label htmlFor="chooser-search" className="sr-only">
              Search photos by name
            </label>
            <TextInput
              id="chooser-search"
              type="search"
              placeholder="Search by name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-11 w-56"
            />
            <button type="button" className={buttonClasses("quiet", "py-2")} onClick={() => dialog.current?.close()}>
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <FormMessage>{error}</FormMessage>
          {!photos && !error ? <p className="text-ink-muted">Loading your photos…</p> : null}
          {photos && photos.length === 0 ? (
            <p className="text-ink-muted">Your Photo Library is empty. Upload photos there first.</p>
          ) : null}
          {photos && photos.length > 0 && shown.length === 0 ? (
            <p className="text-ink-muted">No photos match that name.</p>
          ) : null}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChoose({ id: p.id, thumb: p.thumb });
                    dialog.current?.close();
                  }}
                  className="group block w-full border border-rule bg-white text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {p.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="block aspect-[4/3] bg-surface" />
                  )}
                  <span className="block truncate px-2 py-1.5 text-xs text-ink-muted">{p.fileName ?? "Photo"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
