"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { attachLibraryPhotosAction, listLibraryAction } from "@/lib/admin/library/actions";
import type { LibraryPhoto } from "@/lib/admin/library/service";
import { FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

/**
 * "Choose from library": pick photos that are already uploaded and add them to
 * this animal. Photos the animal already has are left out of the list.
 */
export function LibraryPicker({
  animalId,
  alreadyOnAnimal,
  disabled,
  onAdded,
}: {
  animalId: string;
  alreadyOnAnimal: string[];
  disabled?: boolean;
  onAdded: (count: number) => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [photos, setPhotos] = useState<LibraryPhoto[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => setPicked([]);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  async function open() {
    setError("");
    setQuery("");
    dialog.current?.showModal();
    const result = await listLibraryAction();
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPhotos(result.data);
  }

  const q = query.trim().toLowerCase();
  const available = (photos ?? []).filter(
    (p) => !alreadyOnAnimal.includes(p.id) && (!q || (p.fileName ?? "untitled").toLowerCase().includes(q)),
  );

  async function add() {
    setBusy(true);
    setError("");
    const result = await attachLibraryPhotosAction(animalId, picked);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    dialog.current?.close();
    onAdded(result.data.added);
    router.refresh();
  }

  return (
    <>
      <button type="button" className={buttonClasses("secondary")} onClick={open} disabled={disabled}>
        Choose from library
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="library-picker-title"
        className="m-auto w-[min(60rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] border border-rule bg-paper p-0 text-ink backdrop:bg-night/60"
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-rule px-6 py-4">
            <h3 id="library-picker-title" className="font-display text-2xl">
              Choose from your Photo Library
            </h3>
            <button type="button" className={buttonClasses("quiet")} onClick={() => dialog.current?.close()}>
              Close
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <FormMessage tone="error">{error}</FormMessage>
            <div>
              <label htmlFor="picker-search" className="text-sm font-semibold">
                Find a photo
              </label>
              <TextInput
                id="picker-search"
                type="search"
                value={query}
                placeholder="File name"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {photos === null && !error ? (
              <p role="status" className="text-ink-muted">
                Loading your photos…
              </p>
            ) : available.length === 0 ? (
              <p className="text-ink-muted">
                {photos?.length
                  ? "No other photos to add. Everything in your library is already on this animal, or nothing matches the search."
                  : "Your library is empty. Upload photos here or on the Photo Library page."}
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {available.map((p) => {
                  const on = picked.includes(p.id);
                  return (
                    <li key={p.id}>
                      <label
                        className={clsx(
                          "block cursor-pointer border-2 p-1.5",
                          on ? "border-primary bg-primary/5" : "border-transparent hover:border-rule",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          onChange={() => setPicked(on ? picked.filter((id) => id !== p.id) : [...picked, p.id])}
                        />
                        <span className="block aspect-[4/3] overflow-hidden bg-surface">
                          {p.thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.thumb} alt="" loading="lazy" className="size-full object-cover" />
                          ) : null}
                        </span>
                        <span className="mt-2 flex items-start gap-2 break-all text-sm">
                          <span
                            aria-hidden="true"
                            className={clsx(
                              "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center border text-[0.6875rem]",
                              on ? "border-primary bg-primary text-on-primary" : "border-ink-muted",
                            )}
                          >
                            {on ? "✓" : ""}
                          </span>
                          {p.fileName ?? "Untitled photo"}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-6 py-4">
            <p className="text-sm text-ink-muted" aria-live="polite">
              {picked.length ? `${picked.length} selected` : "Choose one or more photos."}
            </p>
            <button
              type="button"
              className={buttonClasses("primary")}
              onClick={add}
              disabled={busy || picked.length === 0}
            >
              {busy ? "Adding…" : picked.length > 1 ? `Add ${picked.length} photos` : "Add photo"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
