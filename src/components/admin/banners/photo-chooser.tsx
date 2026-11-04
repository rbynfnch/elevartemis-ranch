"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { listLibraryAction } from "@/lib/admin/library/actions";
import type { LibraryPhoto } from "@/lib/admin/library/service";
import { FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { UploadButton, usePhotoUpload } from "@/components/admin/library/use-photo-upload";

/** "Choose from the Photo Library": one photo, picked by clicking it. */
export function PhotoChooser({
  label,
  onChoose,
  onChooseMany,
  trigger,
}: {
  label: string;
  onChoose?: (photo: { id: string; thumb: string | null }) => void;
  /** When given, several photos can be ticked and added together. */
  onChooseMany?: (photos: { id: string; thumb: string | null }[]) => void;
  /** Lays out what opens the chooser (for example a clickable photo box). Without it, a button with `label`. */
  trigger?: (open: () => void) => ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [photos, setPhotos] = useState<LibraryPhoto[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const many = Boolean(onChooseMany);

  // Opening is a request (a counter), so what lays out the trigger never touches the dialog itself.
  const [requests, setRequests] = useState(0);
  const open = () => {
    setError("");
    setQuery("");
    setPicked([]);
    setRequests((n) => n + 1);
  };

  useEffect(() => {
    if (requests === 0) return;
    dialog.current?.showModal();
    if (photos) return;
    let cancelled = false;
    void listLibraryAction().then((result) => {
      if (cancelled) return;
      if (!result.ok) setError(result.message);
      else setPhotos(result.data);
    });
    return () => {
      cancelled = true;
    };
    // Only a new request opens the chooser; the photo list is loaded once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const uploader = usePhotoUpload(async (ids) => {
    // Show the new photos at once; a single new photo is simply the one chosen.
    const fresh = await listLibraryAction();
    if (!fresh.ok) return setError(fresh.message);
    setPhotos(fresh.data);
    if (many) setPicked((now) => [...now, ...ids.filter((i) => !now.includes(i))]);
    else if (ids.length === 1) {
      const p = fresh.data.find((x) => x.id === ids[0]);
      if (p) {
        onChoose?.({ id: p.id, thumb: p.thumb });
        dialog.current?.close();
      }
    }
  });

  const shown = (photos ?? []).filter(
    (p) => !query.trim() || (p.fileName ?? "").toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      {trigger ? (
        trigger(open)
      ) : (
        <button type="button" className={buttonClasses("secondary", "py-2")} onClick={open}>
          {label}
        </button>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="chooser-title"
        className="m-auto h-[min(46rem,calc(100dvh-2rem))] w-[min(60rem,calc(100vw-2rem))] flex-col border border-rule bg-paper p-0 text-ink backdrop:bg-night/60 open:flex"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4">
          <h2 id="chooser-title" className="font-display text-xl">
            {many ? "Choose photos" : "Choose a photo"}
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
            <UploadButton busy={uploader.busy} status={uploader.status} upload={uploader.upload} />
            <button type="button" className={buttonClasses("quiet", "py-2")} onClick={() => dialog.current?.close()}>
              Close
            </button>
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto p-5"
          onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
          onDrop={(e) => {
            if (!e.dataTransfer.files.length) return;
            e.preventDefault();
            void uploader.upload(Array.from(e.dataTransfer.files));
          }}
        >
          <FormMessage>{error}</FormMessage>
          {uploader.problems.map((m) => (
            <FormMessage key={m}>{m}</FormMessage>
          ))}
          {uploader.busy ? (
            <p role="status" className="text-ink-muted">
              {uploader.status || "Uploading…"}
            </p>
          ) : null}
          {!photos && !error ? <p className="text-ink-muted">Loading your photos…</p> : null}
          {photos && photos.length === 0 ? (
            <p className="text-ink-muted">Your Photo Library is empty. Use Upload photos to add your first one.</p>
          ) : null}
          {photos && photos.length > 0 && shown.length === 0 ? (
            <p className="text-ink-muted">No photos match that name.</p>
          ) : null}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={many ? picked.includes(p.id) : undefined}
                  onClick={() => {
                    if (many) return setPicked((now) => (now.includes(p.id) ? now.filter((i) => i !== p.id) : [...now, p.id]));
                    onChoose?.({ id: p.id, thumb: p.thumb });
                    dialog.current?.close();
                  }}
                  className={`group relative block w-full border bg-white text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-primary ${picked.includes(p.id) ? "border-primary ring-2 ring-primary" : "border-rule"}`}
                >
                  {picked.includes(p.id) ? (
                    <span className="absolute right-1 top-1 z-10 bg-primary px-1.5 text-xs font-semibold text-on-primary">
                      {picked.indexOf(p.id) + 1}
                    </span>
                  ) : null}
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
        {many ? (
          <div className="flex items-center justify-between gap-3 border-t border-rule px-5 py-3">
            <p className="text-sm text-ink-muted" role="status">
              {picked.length ? `${picked.length} selected` : "Tick the photos you want, in the order you want them."}
            </p>
            <button
              type="button"
              disabled={!picked.length}
              className={buttonClasses("primary", "py-2 disabled:opacity-40")}
              onClick={() => {
                const byId = new Map((photos ?? []).map((p) => [p.id, p]));
                onChooseMany?.(
                  picked.flatMap((id) => {
                    const p = byId.get(id);
                    return p ? [{ id: p.id, thumb: p.thumb }] : [];
                  }),
                );
                dialog.current?.close();
              }}
            >
              Add {picked.length || ""} photo{picked.length === 1 ? "" : "s"}
            </button>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
