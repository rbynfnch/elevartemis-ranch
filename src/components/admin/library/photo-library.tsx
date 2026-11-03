"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  deleteLibraryPhotoAction,
  deleteLibraryPhotosAction,
  renameLibraryPhotoAction,
  setLibraryCategoryAction,
} from "@/lib/admin/library/actions";
import type { LibraryPhoto } from "@/lib/admin/library/service";
import { splitFileName } from "@/lib/admin/library/file-names";
import { FormMessage, Select, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { AnimalDialog } from "./animal-dialog";
import { isImageFile, uploadToLibrary } from "./upload";

type Message = { tone: "error" | "success"; text: string } | null;
type View = "grid" | "list";
type Sort = "newest" | "oldest" | "name-asc" | "name-desc";

const PAGE_SIZES = [25, 50, 100, 250];
/** The form controls are full width by default; "!" lets these win so the toolbar stays on one row. */
const compactSelect = "w-auto! min-h-10! py-1.5! text-sm!";

const sorters: Record<Sort, (a: LibraryPhoto, b: LibraryPhoto) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  // Untitled photos sort last either way; numbers sort naturally ("mare 2" before "mare 10").
  "name-asc": (a, b) => compareNames(a, b, 1),
  "name-desc": (a, b) => compareNames(a, b, -1),
};

function compareNames(a: LibraryPhoto, b: LibraryPhoto, direction: 1 | -1) {
  if (!a.fileName && !b.fileName) return 0;
  if (!a.fileName) return 1;
  if (!b.fileName) return -1;
  return direction * a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: "base" });
}

export function PhotoLibrary({
  photos,
  species,
}: {
  photos: LibraryPhoto[];
  /** The ranch's enabled species, in the order they should be offered. */
  species: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("grid");
  const [sort, setSort] = useState<Sort>("newest");
  const [category, setCategory] = useState("all");
  const [usage, setUsage] = useState("all");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [applying, setApplying] = useState(false);
  const [animalDialog, setAnimalDialog] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastClicked = useRef<string | null>(null);

  const speciesLabel = Object.fromEntries(species.map((s) => [s.value, s.label]));
  const inCategory = (p: LibraryPhoto, c: string) =>
    c === "all"
      ? true
      : c === "none"
        ? p.category === null && p.usedBy.length === 0
        : p.category === c || (p.species as string[]).includes(c);
  const q = query.trim().toLowerCase();
  const filtered = photos
    .filter(
      (p) =>
        inCategory(p, category) &&
        (usage === "all" || (p.usedBy.length === 0 && !p.usedElsewhere)) &&
        (!q ||
          (p.fileName ?? "untitled").toLowerCase().includes(q) ||
          p.usedBy.some((n) => n.toLowerCase().includes(q))),
    )
    .sort(sorters[sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * pageSize;
  const shown = filtered.slice(firstIndex, firstIndex + pageSize);
  const shownIds = shown.map((p) => p.id);
  const allShownSelected = shownIds.length > 0 && shownIds.every((id) => selected.includes(id));

  /** Any change to what's listed starts again from page 1. */
  function changing<T>(set: (v: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
    };
  }

  function toggle(id: string, shift: boolean) {
    const anchor = lastClicked.current;
    lastClicked.current = id;
    if (shift && anchor && anchor !== id && shownIds.includes(anchor)) {
      // Shift-click selects everything between the last click and this one.
      const [from, to] = [shownIds.indexOf(anchor), shownIds.indexOf(id)].sort((a, b) => a - b);
      setSelected([...new Set([...selected, ...shownIds.slice(from, to + 1)])]);
      return;
    }
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  function endBulk() {
    setBulk(false);
    setSelected([]);
    setAction("");
  }

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

  async function apply() {
    if (!action || selected.length === 0) return;
    const count = selected.length;
    const noun = count === 1 ? "photo" : "photos";
    if (action === "animal") {
      setAnimalDialog(true);
      return;
    }
    setApplying(true);
    setMessage(null);
    if (action.startsWith("cat:")) {
      const value = action.slice(4);
      const result = await setLibraryCategoryAction(selected, value === "clear" ? null : value);
      setMessage(
        result.ok
          ? {
              tone: "success",
              text:
                value === "clear"
                  ? `Category cleared on ${count} ${noun}.`
                  : `${count} ${noun} filed under ${speciesLabel[value] ?? value}.`,
            }
          : { tone: "error", text: result.message },
      );
      if (result.ok) endBulk();
    } else if (action === "delete") {
      if (!window.confirm(`Delete ${count} ${noun} for good? Photos that are in use are kept. This can't be undone.`)) {
        setApplying(false);
        return;
      }
      const result = await deleteLibraryPhotosAction(selected);
      if (result.ok) {
        const { deleted, kept } = result.data;
        setMessage({
          tone: kept ? "error" : "success",
          text: `${deleted} deleted.${kept ? ` ${kept} kept because they're in use. Remove them where they're used first.` : ""}`,
        });
        endBulk();
      } else setMessage({ tone: "error", text: result.message });
    }
    setApplying(false);
    router.refresh();
  }

  const rowProps = (p: LibraryPhoto) => ({
    photo: p,
    onMessage: setMessage,
    selecting: bulk,
    selected: selected.includes(p.id),
    onToggle: (shift: boolean) => toggle(p.id, shift),
    categoryLabel: p.category ? (speciesLabel[p.category] ?? p.category) : null,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <h1 className="font-display text-3xl">Photo Library</h1>
          {uploadOpen ? null : (
            <button
              type="button"
              className={buttonClasses("secondary", "py-2")}
              aria-expanded={false}
              aria-controls="upload-panel"
              onClick={() => setUploadOpen(true)}
            >
              Upload Photos
            </button>
          )}
        </div>
        <p className="max-w-[62ch] text-ink-muted">
          Every photo you&apos;ve uploaded, in one place. Add photos here once, then choose them for any animal.
          Removing a photo from an animal never deletes it from here.
        </p>
      </header>

      {uploadOpen ? (
        <div
          id="upload-panel"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={clsx(
            "relative flex flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-rule bg-white",
          )}
        >
          <button
            type="button"
            aria-label="Close upload"
            title="Close"
            onClick={() => setUploadOpen(false)}
            className="absolute right-2 top-2 inline-flex size-10 items-center justify-center text-ink-muted hover:bg-surface hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <p className="font-semibold">Drag photos here, or</p>
          <button
            type="button"
            className={buttonClasses("primary")}
            onClick={() => fileInput.current?.click()}
            disabled={!!progress}
          >
            Choose photos
          </button>
          <p className="max-w-md text-sm text-ink-muted">
            Each photo keeps its file name, so you can find it here and use it in a spreadsheet. Large photos are
            resized automatically.
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
      ) : null}

      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}

      {photos.length > 0 ? (
        <>
          <div
            role="toolbar"
            aria-label="Find and arrange photos"
            className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border border-rule bg-white px-3 py-2"
          >
            <div role="group" aria-label="View" className="flex">
              <ViewButton current={view} value="list" label="List view" onSelect={setView}>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </ViewButton>
              <ViewButton current={view} value="grid" label="Thumbnail view" onSelect={setView}>
                <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
              </ViewButton>
            </div>

            <Select
              id="library-category"
              aria-label="Show category"
              value={category}
              onChange={(e) => changing(setCategory)(e.target.value)}
              className={compactSelect}
            >
              <option value="all">All categories</option>
              {species.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
              <option value="none">Uncategorized</option>
            </Select>
            <Select
              id="library-usage"
              aria-label="Show photos"
              value={usage}
              onChange={(e) => changing(setUsage)(e.target.value)}
              className={compactSelect}
            >
              <option value="all">All photos</option>
              <option value="unused">Not used yet</option>
            </Select>
            <Select
              id="library-sort"
              aria-label="Sort by"
              value={sort}
              onChange={(e) => changing(setSort)(e.target.value as Sort)}
              className={compactSelect}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </Select>
            <Select
              id="library-page-size"
              aria-label="Photos per page"
              value={String(pageSize)}
              onChange={(e) => changing(setPageSize)(Number(e.target.value))}
              className={compactSelect}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </Select>

            <button
              type="button"
              className={buttonClasses(bulk ? "primary" : "secondary", "min-h-10! gap-2 px-3! py-1.5! text-sm!")}
              aria-pressed={bulk}
              onClick={() => (bulk ? endBulk() : setBulk(true))}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 5h4v4H4zM4 15h4v4H4zM12 7h8M12 17h8" />
              </svg>
              {bulk ? "Cancel" : "Bulk select"}
            </button>

            <div className="relative ml-auto">
              <label htmlFor="library-search" className="sr-only">
                Search photos by name or animal
              </label>
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6" />
                <path d="m20 20-4.500-4.500" />
              </svg>
              <TextInput
                id="library-search"
                type="search"
                value={query}
                placeholder="Search photos"
                onChange={(e) => changing(setQuery)(e.target.value)}
                className="min-h-10! w-52! py-1.5! pl-9! text-sm!"
              />
            </div>
          </div>

          {bulk ? (
            <div
              role="group"
              aria-label="Actions for selected photos"
              className="flex flex-wrap items-center gap-x-5 gap-y-3 border border-rule bg-white px-4 py-3"
            >
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={allShownSelected}
                  disabled={shownIds.length === 0}
                  onChange={() =>
                    setSelected(
                      allShownSelected
                        ? selected.filter((id) => !shownIds.includes(id))
                        : [...new Set([...selected, ...shownIds])],
                    )
                  }
                />
                Select all on this page
              </label>
              <button
                type="button"
                className={buttonClasses("quiet")}
                onClick={() => setSelected([])}
                disabled={selected.length === 0}
              >
                Deselect
              </button>
              <p className="text-sm text-ink-muted" aria-live="polite">
                {selected.length ? `${selected.length} selected` : "Click photos to select them."}
              </p>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                <Select
                  id="bulk-action"
                  aria-label="Action for selected photos"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className={clsx(compactSelect, "min-w-52!")}
                  disabled={selected.length === 0}
                >
                  <option value="">Choose an action…</option>
                  <optgroup label="File under">
                    {species.map((s) => (
                      <option key={s.value} value={`cat:${s.value}`}>
                        {s.label}
                      </option>
                    ))}
                    <option value="cat:clear">No category</option>
                  </optgroup>
                  <option value="animal">Add to an animal…</option>
                  <option value="delete">Delete</option>
                </Select>
                <button
                  type="button"
                  className={buttonClasses("primary", "min-h-11 py-2")}
                  onClick={apply}
                  disabled={!action || selected.length === 0 || applying}
                >
                  {applying ? "Applying…" : "Apply"}
                </button>
              </div>
            </div>
          ) : null}

          <p className="text-sm text-ink-muted" aria-live="polite">
            {filtered.length === 0
              ? `Showing 0 of ${photos.length} photos.`
              : `Showing ${firstIndex + 1}–${firstIndex + shown.length} of ${filtered.length}${
                  filtered.length === photos.length ? "" : ` (${photos.length} in total)`
                }.`}{" "}
            Double-click a name to rename it.
          </p>
        </>
      ) : null}

      {photos.length === 0 ? (
        <p className="text-ink-muted">
          No photos yet. Choose <strong>Upload Photos</strong> above, then add them to animals from here.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-ink-muted">No photos match. Clear the search or change the filters.</p>
      ) : view === "grid" ? (
        <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p) => (
            <li key={p.id}>
              <GridCard {...rowProps(p)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Photos</caption>
            <thead>
              <tr className="border-b border-rule text-sm text-ink-muted">
                {bulk ? (
                  <th scope="col" className="w-12 py-2 pr-2">
                    <span className="sr-only">Select</span>
                  </th>
                ) : null}
                <th scope="col" className="w-24 py-2 pr-4">
                  <span className="sr-only">Photo</span>
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Name
                </th>
                <th scope="col" className="hidden py-2 pr-4 font-semibold md:table-cell">
                  Category
                </th>
                <th scope="col" className="hidden py-2 pr-4 font-semibold lg:table-cell">
                  On
                </th>
                <th scope="col" className="hidden py-2 pr-4 font-semibold md:table-cell">
                  Added
                </th>
                <th scope="col" className="w-12 py-2">
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <ListRow key={p.id} {...rowProps(p)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 ? (
        <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            type="button"
            className={buttonClasses("secondary", "py-2")}
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <p className="text-sm" aria-live="polite">
            Page {currentPage} of {pageCount}
          </p>
          <button
            type="button"
            className={buttonClasses("secondary", "py-2")}
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= pageCount}
          >
            Next
          </button>
        </nav>
      ) : null}

      <AnimalDialog
        open={animalDialog}
        photoIds={selected}
        onClose={() => setAnimalDialog(false)}
        onDone={(text) => {
          setAnimalDialog(false);
          setMessage({ tone: "success", text });
          endBulk();
          router.refresh();
        }}
      />
    </div>
  );
}

function ViewButton({
  current,
  value,
  label,
  onSelect,
  children,
}: {
  current: View;
  value: View;
  label: string;
  onSelect: (v: View) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={current === value}
      onClick={() => onSelect(value)}
      className={clsx(
        "inline-flex size-10 items-center justify-center",
        current === value ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

type RowProps = {
  photo: LibraryPhoto;
  onMessage: (m: Message) => void;
  selecting: boolean;
  selected: boolean;
  onToggle: (shift: boolean) => void;
  categoryLabel: string | null;
};

const photoLabel = (p: LibraryPhoto) => p.fileName ?? "Untitled photo";
const usageText = (p: LibraryPhoto) =>
  p.usedBy.length
    ? `${p.usedBy.slice(0, 3).join(", ")}${p.usedBy.length > 3 ? ` and ${p.usedBy.length - 3} more` : ""}`
    : p.usedElsewhere
      ? "Used on the website"
      : "Not used yet";

function GridCard({ photo, onMessage, selecting, selected, onToggle, categoryLabel }: RowProps) {
  const label = photoLabel(photo);
  const thumb = photo.thumb ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
  ) : null;

  return (
    <article className="space-y-3">
      {selecting ? (
        <button
          type="button"
          aria-pressed={selected}
          aria-label={`Select ${label}`}
          onClick={(e) => onToggle(e.shiftKey)}
          className={clsx(
            "group relative block aspect-[4/3] w-full overflow-hidden bg-surface outline-offset-2",
            selected && "ring-4 ring-primary",
          )}
        >
          {thumb}
          <span
            aria-hidden="true"
            className={clsx(
              "absolute left-2 top-2 inline-flex size-6 items-center justify-center border-2 text-sm font-bold",
              selected
                ? "border-primary bg-primary text-on-primary"
                : "border-white bg-black/30 text-transparent group-hover:text-white/70",
            )}
          >
            ✓
          </span>
        </button>
      ) : (
        <div className="aspect-[4/3] overflow-hidden bg-surface">{thumb}</div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <RenameName photo={photo} />
        </div>
        <TrashButton photo={photo} onMessage={onMessage} />
      </div>
      {categoryLabel ? <p className="text-sm font-semibold text-primary">{categoryLabel}</p> : null}
      <p className="text-sm text-ink-muted">{photo.usedBy.length ? `On: ${usageText(photo)}` : usageText(photo)}</p>
    </article>
  );
}

function ListRow({ photo, onMessage, selecting, selected, onToggle, categoryLabel }: RowProps) {
  const label = photoLabel(photo);
  return (
    <tr className={clsx("border-b border-rule align-middle", selected && "bg-primary/5")}>
      {selecting ? (
        <td className="py-2 pr-2">
          <input
            type="checkbox"
            aria-label={`Select ${label}`}
            checked={selected}
            className="size-5"
            // Checkbox clicks carry shiftKey too, so ranges work in the list as well.
            onClick={(e) => onToggle(e.shiftKey)}
            onChange={() => {}}
          />
        </td>
      ) : null}
      <td className="py-2 pr-4">
        <div className="aspect-[4/3] w-20 overflow-hidden bg-surface">
          {photo.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : null}
        </div>
      </td>
      <td className="py-2 pr-4">
        <RenameName photo={photo} />
        <p className="text-sm text-ink-muted md:hidden">
          {[categoryLabel, usageText(photo)].filter(Boolean).join(" · ")}
        </p>
      </td>
      <td className="hidden py-2 pr-4 text-sm md:table-cell">
        {categoryLabel ?? <span className="text-ink-muted">—</span>}
      </td>
      <td className="hidden py-2 pr-4 text-sm text-ink-muted lg:table-cell">{usageText(photo)}</td>
      <td className="hidden py-2 pr-4 text-sm text-ink-muted md:table-cell">
        <time dateTime={photo.createdAt} suppressHydrationWarning>
          {new Date(photo.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
        </time>
      </td>
      <td className="py-2">
        <TrashButton photo={photo} onMessage={onMessage} />
      </td>
    </tr>
  );
}

/** The photo's name. Double-click (or Enter / F2, or one tap on a touch screen) to rename it in place. */
function RenameName({ photo }: { photo: LibraryPhoto }) {
  const router = useRouter();
  // The owner edits only the name; the photo keeps its file type (.jpg, .png…) automatically.
  const { base, ext } = splitFileName(photo.fileName ?? "");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(base);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Set once an edit is finished (saved or cancelled), so the box losing focus afterwards can't save again.
  const finished = useRef(true);
  const label = photoLabel(photo);

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

  if (editing) {
    return (
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
    );
  }

  return (
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
  );
}

function TrashButton({ photo, onMessage }: { photo: LibraryPhoto; onMessage: (m: Message) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const used = photo.usedBy.length > 0 || photo.usedElsewhere;
  const label = photoLabel(photo);

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
  );
}
