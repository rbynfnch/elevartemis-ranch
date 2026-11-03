"use client";

import { useEffect, useRef, useState } from "react";
import { attachLibraryPhotosAction, searchAnimalsAction } from "@/lib/admin/library/actions";
import type { AnimalChoice } from "@/lib/admin/library/service";
import { FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

/** "Add to an animal": search by name, pick one, and the selected photos go onto it. */
export function AnimalDialog({
  open,
  photoIds,
  onClose,
  onDone,
}: {
  open: boolean;
  photoIds: string[];
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimalChoice[] | null>(null);
  const [chosen, setChosen] = useState<AnimalChoice | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      setQuery("");
      setChosen(null);
      setError("");
      setResults(null);
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Search as the owner types (short pause so it isn't a request per keystroke).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const result = await searchAnimalsAction(query);
      if (cancelled) return;
      if (!result.ok) setError(result.message);
      else {
        setError("");
        setResults(result.data);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, open]);

  async function add() {
    if (!chosen) return;
    setBusy(true);
    setError("");
    const result = await attachLibraryPhotosAction(chosen.id, photoIds);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const n = result.data.added;
    onDone(
      n === 0
        ? `Those photos were already on ${chosen.name}.`
        : `${n} ${n === 1 ? "photo" : "photos"} added to ${chosen.name}.`,
    );
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="animal-dialog-title"
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] border border-rule bg-paper p-0 text-ink backdrop:bg-night/60"
    >
      <div className="space-y-4 px-6 py-5">
        <h3 id="animal-dialog-title" className="font-display text-2xl">
          Add {photoIds.length} {photoIds.length === 1 ? "photo" : "photos"} to an animal
        </h3>
        <FormMessage tone="error">{error}</FormMessage>
        <div>
          <label htmlFor="animal-search" className="text-sm font-semibold">
            Find an animal
          </label>
          <TextInput
            id="animal-search"
            type="search"
            value={query}
            placeholder="Start typing a name"
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setChosen(null);
            }}
          />
        </div>
        {results === null ? (
          <p role="status" className="text-ink-muted">
            Searching…
          </p>
        ) : results.length === 0 ? (
          <p className="text-ink-muted">No animals match.</p>
        ) : (
          <fieldset>
            <legend className="sr-only">Animals</legend>
            <ul className="max-h-72 divide-y divide-rule overflow-y-auto border border-rule bg-white">
              {results.map((a) => (
                <li key={a.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-surface">
                    <input type="radio" name="animal" checked={chosen?.id === a.id} onChange={() => setChosen(a)} />
                    <span className="flex-1 font-semibold">{a.name}</span>
                    <span className="text-sm text-ink-muted">{a.detail}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button type="button" className={buttonClasses("quiet")} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={buttonClasses("primary")} onClick={add} disabled={!chosen || busy}>
            {busy ? "Adding…" : chosen ? `Add to ${chosen.name}` : "Choose an animal"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
