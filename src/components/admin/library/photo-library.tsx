"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { deleteLibraryPhotoAction, renameLibraryPhotoAction } from "@/lib/admin/library/actions";
import type { LibraryPhoto } from "@/lib/admin/library/service";
import { FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { isImageFile, uploadToLibrary } from "./upload";

type Message = { tone: "error" | "success"; text: string } | null;

export function PhotoLibrary({ photos }: { photos: LibraryPhoto[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const shown = photos.filter(
    (p) =>
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
          {shown.length} of {photos.length} {photos.length === 1 ? "photo" : "photos"}
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
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(photo.fileName ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const used = photo.usedBy.length > 0 || photo.usedElsewhere;

  async function save() {
    setBusy(true);
    setError("");
    const result = await renameLibraryPhotoAction(photo.id, name);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete ${photo.fileName ?? "this photo"} for good? This can't be undone.`)) return;
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

  async function copy() {
    if (!photo.fileName) return;
    try {
      await navigator.clipboard.writeText(photo.fileName);
      onMessage({ tone: "success", text: `Copied ${photo.fileName}.` });
    } catch {
      onMessage({ tone: "error", text: "Couldn't copy. Select the name and copy it yourself." });
    }
  }

  return (
    <article className="space-y-3">
      <div className="aspect-[4/3] overflow-hidden bg-surface">
        {photo.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : null}
      </div>

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-2"
        >
          <label htmlFor={`name-${photo.id}`} className="sr-only">
            File name
          </label>
          <TextInput
            id={`name-${photo.id}`}
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            invalid={!!error}
          />
          {error ? <p className="text-sm font-semibold text-[#8a2b1d]">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" className={buttonClasses("primary", "px-4 py-2")} disabled={busy}>
              {busy ? "Saving…" : "Save name"}
            </button>
            <button
              type="button"
              className={buttonClasses("quiet")}
              onClick={() => {
                setEditing(false);
                setName(photo.fileName ?? "");
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="break-all font-semibold">{photo.fileName ?? "Untitled photo"}</p>
      )}

      <p className="text-sm text-ink-muted">
        {photo.usedBy.length
          ? `On: ${photo.usedBy.slice(0, 3).join(", ")}${photo.usedBy.length > 3 ? ` and ${photo.usedBy.length - 3} more` : ""}`
          : photo.usedElsewhere
            ? "Used on the website"
            : "Not used yet"}
      </p>

      {!editing ? (
        <div className="flex flex-wrap gap-x-4">
          <button type="button" className={buttonClasses("quiet")} onClick={() => setEditing(true)}>
            {photo.fileName ? "Rename" : "Name it"}
          </button>
          {photo.fileName ? (
            <button type="button" className={buttonClasses("quiet")} onClick={copy}>
              Copy name
            </button>
          ) : null}
          <button
            type="button"
            className="min-h-11 text-[#8a2b1d] underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={remove}
            disabled={busy || used}
            title={used ? "Remove it from where it's used first." : undefined}
          >
            Delete
          </button>
        </div>
      ) : null}
    </article>
  );
}
