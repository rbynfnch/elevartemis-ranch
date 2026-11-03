"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { addBreedAction, removeBreedAction, renameBreedAction, restoreBreedAction } from "@/lib/admin/breeds/actions";
import { breedSuggestions, type BreedItem } from "@/lib/admin/breeds/service";
import { FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

type Message = { tone: "error" | "success"; text: string } | null;
type SpeciesSection = { value: "horse" | "cattle"; label: string; starters: string[] };

export function BreedsManager({ breeds, sections }: { breeds: BreedItem[]; sections: SpeciesSection[] }) {
  const [message, setMessage] = useState<Message>(null);
  return (
    <div className="space-y-12">
      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
      {sections.map((section) => (
        <Section
          key={section.value}
          section={section}
          breeds={breeds.filter((b) => b.species === section.value)}
          onMessage={setMessage}
        />
      ))}
    </div>
  );
}

function Section({
  section,
  breeds,
  onMessage,
}: {
  section: SpeciesSection;
  breeds: BreedItem[];
  onMessage: (m: Message) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const listed = breeds.filter((b) => !b.hidden);
  const suggestions = breedSuggestions(breeds, section.starters);

  async function add(raw: string, restoreId: string | null = null) {
    setBusy(true);
    const result = restoreId ? await restoreBreedAction(restoreId) : await addBreedAction(section.value, raw);
    setBusy(false);
    if (!result.ok) {
      onMessage({ tone: "error", text: result.message });
      return;
    }
    onMessage({ tone: "success", text: `${result.data.name} added.` });
    setName("");
    router.refresh();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) void add(name);
  }

  return (
    <section aria-labelledby={`breeds-${section.value}`} className="space-y-5">
      <h2 id={`breeds-${section.value}`} className="font-display text-2xl">
        {section.label}
      </h2>

      {listed.length === 0 ? (
        <p className="text-ink-muted">
          No {section.label.toLowerCase()} breeds yet. Add one below, or pick from the suggestions.
        </p>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {listed.map((b) => (
            <li key={b.id} className="flex items-center gap-4 py-1">
              <div className="min-w-0 flex-1">
                <BreedName breed={b} onMessage={onMessage} />
              </div>
              <p className="shrink-0 text-sm text-ink-muted">
                {b.animals === 0 ? "No animals" : b.animals === 1 ? "1 animal" : `${b.animals} animals`}
              </p>
              <DeleteBreed breed={b} onMessage={onMessage} />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="flex max-w-xl flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor={`new-${section.value}`} className="text-sm font-semibold">
            Add a {section.label.toLowerCase()} breed
          </label>
          <TextInput
            id={`new-${section.value}`}
            value={name}
            maxLength={80}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button type="submit" className={buttonClasses("primary")} disabled={busy || !name.trim()}>
          {busy ? "Adding…" : "Add breed"}
        </button>
      </form>

      {suggestions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-ink-muted">
            Breeds you can add. Ones you removed earlier are here too. Click one to add it to your list.
          </p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void add(s.name, s.restoreId)}
                  className="inline-flex min-h-10 items-center gap-1.5 border border-rule bg-white px-3 text-sm hover:border-primary"
                >
                  <span aria-hidden="true">+</span> {s.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** Double-click (or Enter / F2, or one tap on a touch screen) to rename. Animals using the breed follow. */
function BreedName({ breed, onMessage }: { breed: BreedItem; onMessage: (m: Message) => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(breed.name);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Set once an edit is finished, so the box losing focus afterwards can't save again.
  const finished = useRef(true);

  function start() {
    finished.current = false;
    setName(breed.name);
    setError("");
    setEditing(true);
  }
  function cancel() {
    finished.current = true;
    setEditing(false);
    setError("");
  }
  async function save() {
    if (busy || finished.current) return;
    if (name.trim() === breed.name) {
      cancel();
      return;
    }
    setBusy(true);
    setError("");
    const result = await renameBreedAction(breed.id, name);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    finished.current = true;
    setEditing(false);
    onMessage({
      tone: "success",
      text: breed.animals
        ? `Renamed to ${result.data.name}. ${breed.animals === 1 ? "1 animal was" : `${breed.animals} animals were`} updated.`
        : `Renamed to ${result.data.name}.`,
    });
    router.refresh();
  }

  if (editing) {
    return (
      <div className="space-y-1.5 py-1">
        <label htmlFor={`rename-${breed.id}`} className="sr-only">
          Breed name. Press Enter to save or Escape to cancel.
        </label>
        <TextInput
          id={`rename-${breed.id}`}
          value={name}
          maxLength={80}
          autoFocus
          disabled={busy}
          invalid={!!error}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
        />
        {error ? <p className="text-sm font-semibold text-[#8a2b1d]">{error}</p> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      title="Double-click to rename"
      aria-label={`${breed.name}. Double-click or press Enter to rename.`}
      className="block min-h-11 w-full text-left font-semibold hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4"
      onDoubleClick={start}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "F2") {
          e.preventDefault();
          start();
        }
      }}
      onClick={(e) => {
        if ((e.nativeEvent as PointerEvent).pointerType === "touch") start();
      }}
    >
      {breed.name}
    </button>
  );
}

function DeleteBreed({ breed, onMessage }: { breed: BreedItem; onMessage: (m: Message) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const inUse = breed.animals > 0;

  async function remove() {
    if (!window.confirm(`Remove ${breed.name} from your list? You can add it back from the suggestions below.`)) return;
    setBusy(true);
    const result = await removeBreedAction(breed.id);
    setBusy(false);
    if (!result.ok) {
      onMessage({ tone: "error", text: result.message });
      return;
    }
    onMessage({ tone: "success", text: `${breed.name} removed. It's in the suggestions if you want it back.` });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy || inUse}
      aria-label={`Remove ${breed.name}`}
      title={inUse ? "Animals use this breed. Change them to another breed first." : "Remove this breed"}
      className={clsx(
        "inline-flex size-11 shrink-0 items-center justify-center text-[#8a2b1d] hover:bg-[#8a2b1d]/10",
        "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 7h16M9 7V4.500h6V7M6.500 7l1 12.500h9l1-12.500M10 11v5.500M14 11v5.500" />
      </svg>
    </button>
  );
}
