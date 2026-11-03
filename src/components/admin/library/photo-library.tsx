"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { deleteLibraryPhotoAction, renameLibraryPhotoAction } from "@/lib/admin/library/actions";
import type { LibraryPhoto } from "@/lib/admin/library/service";
import { splitFileName } from "@/lib/admin/library/file-names";
import { FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { isImageFile, uploadToLibrary } from "./upload";

type Message = { tone: "error" | "success"; text: string } | null;

/** "all" = everything; a species key = photos on animals of that species; "none" = not on any animal. */
type Group = string;

export function PhotoLibrary({
  photos,
  species,
}: {
  photos: LibraryPhoto[];
  /** The ranch's enabled species, in the order tabs should appear. */
  species: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [group, setGroup] = useState<Group>("all");
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const inGroup = (p: LibraryPhoto, g: Group) =>
    g === "all" ? true : g === "none" ? p.usedBy.length === 0 : (p.species as string[]).includes(g);
  const tabs = [{ value: "all", label: "All" }, ...species, { value: "none", label: "Not on an animal" }].map((t) => ({
    ...t,
    count: photos.filter((p) => inGroup(p, t.value)).length,
  }));
  const shown = photos.filter(
    (p) =>
      inGroup(p, group) &&
      (!q ||
        (p.fileName ?? "untitled").toLowerCase().includes(q) ||
        p.usedBy.some((n) => n.toLowerCase().includes(q))) &&
      (!unusedOnly || (p.usedBy.length === 0 && !p.usedElsewhere)),
  );

  async function upload(files: File[]) {
    const images = files.filter(isImageFile);
    if (!images.length) return;
    setMessage(null);
    const errors: string[] = [];
    // One at a time: kinder to slow connections, and progress is easy to follow.
    for (let i = 0; i < images.length; i++) {
      setProgress({ done: i, total: images.length, current: images[i].name });
      try {
        await uploadToLibrary(images[i]);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
      router.refresh();
    }
    setProgress(null);
    setMessage(
      errors.length
        ? { tone: "error", text: errors.join(" ") }
        : { tone: "success", text: images.length === 1 ? "Photo added." : `${images.length} photos added.` },
    );
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void upload(Array.from(e.dataTransfer.files));
  }

  return (
    <div className="space-y-8">
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={clsx(
          "flex flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-rule bg-white",
        )}
      >
        <p className="font-semibold">Drag photos here, or</p>
        <button
          type="button"
          className={buttonClasses("primary")}
          onClick={() => fileInput.current?.click()}
          disabled={!!progress}
        >
          Upload Photos
        </button>
        <p className="max-w-md text-sm text-ink-muted">
          Each photo keeps its file name, so you can find it here and use it in a spreadsheet. Large photos are resized
          automatically.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void upload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        {progress ? (
          <p role="status" className="text-sm font-semibold text-primary">
            Uploading {progress.done + 1} of {progress.total}: {progress.current}
          </p>
        ) : null}
      </div>

      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}

      <div role="group" aria-label="Show photos of" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={group === t.value}
            onClick={() => setGroup(t.value)}
            className={clsx(
              "inline-flex min-h-11 items-center gap-2 border px-4 text-[0.9375rem] font-semibold",
              group === t.value
                ? "border-primary bg-primary text-on-primary"
                : "border-rule bg-white text-ink hover:border-primary",
            )}
          >
            {t.label}
            <span className={clsx("text-sm font-normal", group === t.value ? "opacity-85" : "text-ink-muted")}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-60 flex-1">
          <label htmlFor="library-search" className="text-sm font-semibold">
            Find a photo
          </label>
          <TextInput
            id="library-search"
            type="search"
            value={query}
            placeholder="File name or animal"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={unusedOnly} onChange={(e) => setUnusedOnly(e.target.checked)} />
          Only photos nothing uses
        </label>
        <p className="min-h-11 content-center text-sm text-ink-muted">
          Double-click a name to rename it. {shown.length} of {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </p>
      </div>

      {photos.length === 0 ? (
        <p className="text-ink-muted">No photos yet. Upload some above, then add them to animals from here.</p>
      ) : shown.length === 0 ? (
        <p className="text-ink-muted">No photos match. Clear the search or the filter.</p>
      ) : (
        <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p) => (
            <li key={p.id}>
              <LibraryCard photo={p} onMessage={setMessage} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LibraryCard({ photo, onMessage }: { photo: LibraryPhoto; onMessage: (m: Message) => void }) {
  const router = useRouter();
  // The owner edits only the name; the photo keeps its file type (.jpg, .png…) automatically.
  const { base, ext } = splitFileName(photo.fileName ?? "");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(base);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Set once an edit is finished (saved or cancelled), so the box losing focus afterwards can't save again.
  const finished = useRef(true);
  const used = photo.usedBy.length > 0 || photo.usedElsewhere;
  const label = photo.fileName ?? "Untitled photo";

  function startEditing() {
    finished.current = false;
    setName(base);
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
    if (name.trim() === base.trim()) {
      cancel();
      return;
    }
    setBusy(true);
    setError("");
    const result = await renameLibraryPhotoAction(photo.id, name);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    finished.current = true;
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete ${label} for good? This can't be undone.`)) return;
    setBusy(true);
    const result = await deleteLibraryPhotoAction(photo.id);
    setBusy(false);
    if (!result.ok) {
      onMessage({ tone: "error", text: result.message });
      return;
    }
    onMessage({ tone: "success", text: "Photo deleted." });
    router.refresh();
  }

  return (
    <article className="space-y-3">
      <div className="aspect-[4/3] overflow-hidden bg-surface">
        {photo.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-1.5">
              <label htmlFor={`name-${photo.id}`} className="sr-only">
                Photo name. Press Enter to save or Escape to cancel.
              </label>
              <div className="flex items-center gap-2">
                <TextInput
                  id={`name-${photo.id}`}
                  value={name}
                  maxLength={190}
                  autoFocus
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
                  invalid={!!error}
                  disabled={busy}
                />
                {ext ? <span className="text-ink-muted">{ext}</span> : null}
              </div>
              {error ? <p className="text-sm font-semibold text-[#8a2b1d]">{error}</p> : null}
            </div>
          ) : (
            <button
              type="button"
              title="Double-click to rename"
              aria-label={`${label}. Double-click or press Enter to rename.`}
              className="block min-h-11 w-full break-all text-left font-semibold hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4"
              onDoubleClick={startEditing}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "F2") {
                  e.preventDefault();
                  startEditing();
                }
              }}
              // Touch screens don't double-click reliably, so one tap renames there.
              onClick={(e) => {
                if ((e.nativeEvent as PointerEvent).pointerType === "touch") startEditing();
              }}
            >
              {label}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={remove}
          disabled={busy || used}
          aria-label={`Delete ${label}`}
          title={used ? "This photo is in use. Remove it where it's used first." : "Delete this photo"}
          className="inline-flex size-11 shrink-0 items-center justify-center text-[#8a2b1d] hover:bg-[#8a2b1d]/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
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
      </div>

      <p className="text-sm text-ink-muted">
        {photo.usedBy.length
          ? `On: ${photo.usedBy.slice(0, 3).join(", ")}${photo.usedBy.length > 3 ? ` and ${photo.usedBy.length - 3} more` : ""}`
          : photo.usedElsewhere
            ? "Used on the website"
            : "Not used yet"}
      </p>
    </article>
  );
}
