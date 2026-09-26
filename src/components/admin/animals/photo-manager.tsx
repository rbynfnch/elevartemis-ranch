"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import clsx from "clsx";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { prepareUpload } from "@/lib/media/prepare-upload";
import {
  finishPhotoUploadAction,
  removePhotoAction,
  reorderPhotosAction,
  setMainPhotoAction,
  startPhotoUploadAction,
  updatePhotoAction,
} from "@/lib/admin/animals/actions";
import { buttonClasses } from "@/components/ui/button";
import { FormMessage, TextInput } from "@/components/admin/forms";

export type Photo = {
  id: string;
  isPrimary: boolean;
  thumb: string | null;
  large: string | null;
  focalX: number;
  focalY: number;
  alt: string | null;
  status: string;
};

type Progress = { done: number; total: number; current: string } | null;

export function PhotoManager({
  animalId,
  animalName,
  photos: initial,
}: {
  animalId: string;
  animalName: string;
  photos: Photo[];
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initial);
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    // Fresh data from the server (after an upload): adopt it.
    setLastInitial(initial);
    setPhotos(initial);
  }
  const [progress, setProgress] = useState<Progress>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function uploadOne(file: File): Promise<string | null> {
    const { blob, takenAt } = await prepareUpload(file);
    const start = await startPhotoUploadAction();
    if (!start.ok) throw new Error(start.message);
    const { error } = await createBrowserSupabase()
      .storage.from("ranch-originals")
      .uploadToSignedUrl(start.data.path, start.data.token, blob, { contentType: "image/jpeg" });
    if (error) throw new Error(`${file.name} didn't upload. Check your connection and try again.`);
    const finish = await finishPhotoUploadAction({ mediaId: start.data.mediaId, animalId, takenAt, altText: null });
    if (!finish.ok) throw new Error(finish.message);
    return start.data.mediaId;
  }

  async function upload(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!images.length) return;
    setMessage(null);
    const errors: string[] = [];
    // One at a time: kinder to slow connections, and progress is easy to follow.
    for (let i = 0; i < images.length; i++) {
      setProgress({ done: i, total: images.length, current: images[i].name });
      try {
        const newId = await uploadOne(images[i]);
        const oldId = replaceTarget.current;
        if (newId && oldId) {
          // Replace: the new photo takes the old one's place (and main-photo role).
          replaceTarget.current = null;
          const wasPrimary = photos.find((p) => p.id === oldId)?.isPrimary;
          const order = photos.map((p) => (p.id === oldId ? newId : p.id));
          await reorderPhotosAction(animalId, order);
          if (wasPrimary) await setMainPhotoAction(animalId, newId);
          await removePhotoAction(animalId, oldId);
        }
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

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = photos.findIndex((p) => p.id === active.id);
    const to = photos.findIndex((p) => p.id === over.id);
    const next = arrayMove(photos, from, to);
    setPhotos(next);
    const result = await reorderPhotosAction(
      animalId,
      next.map((p) => p.id),
    );
    if (!result.ok) {
      setPhotos(photos);
      setMessage({ tone: "error", text: result.message });
    }
  }

  async function makeMain(id: string) {
    setPhotos(photos.map((p) => ({ ...p, isPrimary: p.id === id })));
    const result = await setMainPhotoAction(animalId, id);
    if (!result.ok) setMessage({ tone: "error", text: result.message });
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this photo?")) return;
    setPhotos(photos.filter((p) => p.id !== id));
    const result = await removePhotoAction(animalId, id);
    if (!result.ok) setMessage({ tone: "error", text: result.message });
    router.refresh();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void upload(Array.from(e.dataTransfer.files));
  }

  const editingPhoto = photos.find((p) => p.id === editing) ?? null;

  return (
    <div className="space-y-6">
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
          Any size or shape is fine. Large photos are resized automatically, and you can choose the part of each photo
          that matters most.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void upload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {progress ? (
        <div role="status" className="space-y-2">
          <p className="text-sm">
            Uploading {progress.done + 1} of {progress.total}: {progress.current}
          </p>
          <div className="h-1.5 bg-surface">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${((progress.done + 0.5) / progress.total) * 100}%` }}
            />
          </div>
        </div>
      ) : null}
      <FormMessage tone={message?.tone}>{message?.text}</FormMessage>

      {photos.length ? (
        <>
          <p className="text-sm text-ink-muted">
            Drag to reorder (or focus a photo and use the arrow keys). The main photo is used on cards and the For Sale
            page.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo, index) => (
                  <SortablePhoto
                    key={photo.id}
                    photo={photo}
                    index={index}
                    animalName={animalName}
                    onMain={() => makeMain(photo.id)}
                    onEdit={() => setEditing(photo.id)}
                    onReplace={() => {
                      replaceTarget.current = photo.id;
                      fileInput.current?.click();
                    }}
                    onRemove={() => remove(photo.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <p className="text-ink-muted">No photos yet. Until there are, the website shows a simple placeholder.</p>
      )}

      {editingPhoto ? (
        <FocalEditor
          key={editingPhoto.id}
          photo={editingPhoto}
          animalName={animalName}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setPhotos(photos.map((x) => (x.id === p.id ? p : x)));
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function SortablePhoto({
  photo,
  index,
  animalName,
  onMain,
  onEdit,
  onReplace,
  onRemove,
}: {
  photo: Photo;
  index: number;
  animalName: string;
  onMain: () => void;
  onEdit: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx("border border-rule bg-white", isDragging && "relative z-10 shadow-lg")}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`Photo ${index + 1} of ${animalName}${photo.isPrimary ? ", main photo" : ""}. Press space to pick up and reorder.`}
        className="relative aspect-[4/3] cursor-grab touch-none overflow-hidden bg-surface active:cursor-grabbing"
      >
        {photo.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.thumb}
            alt=""
            className="size-full object-cover"
            style={{ objectPosition: `${photo.focalX * 100}% ${photo.focalY * 100}%` }}
            draggable={false}
          />
        ) : (
          <p className="p-3 text-sm text-ink-muted">
            {photo.status === "failed" ? "Couldn't process this photo." : "Processing…"}
          </p>
        )}
        {photo.isPrimary ? (
          <span className="absolute left-2 top-2 bg-primary px-2 py-0.5 text-xs font-semibold text-on-primary">
            Main photo
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-3 px-2 py-1.5 text-sm">
        {!photo.isPrimary ? (
          <button
            type="button"
            className="min-h-11 text-primary underline decoration-accent underline-offset-4"
            onClick={onMain}
          >
            Make main
          </button>
        ) : null}
        <button
          type="button"
          className="min-h-11 text-primary underline decoration-accent underline-offset-4"
          onClick={onEdit}
        >
          Adjust
        </button>
        <button
          type="button"
          className="min-h-11 text-primary underline decoration-accent underline-offset-4"
          onClick={onReplace}
        >
          Replace
        </button>
        <button type="button" className="min-h-11 text-[#8a2b1d] underline underline-offset-4" onClick={onRemove}>
          Remove
        </button>
      </div>
    </li>
  );
}

/** Click the part of the photo that matters most; every crop keeps it in view. */
function FocalEditor({
  photo,
  animalName,
  onClose,
  onSaved,
}: {
  photo: Photo;
  animalName: string;
  onClose: () => void;
  onSaved: (p: Photo) => void;
}) {
  const [focal, setFocal] = useState({ x: photo.focalX, y: photo.focalY });
  const [alt, setAlt] = useState(photo.alt ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const src = photo.large ?? photo.thumb;
  if (!src) return null;
  const position = `${focal.x * 100}% ${focal.y * 100}%`;

  async function save() {
    setSaving(true);
    const result = await updatePhotoAction(photo.id, { altText: alt, focalX: focal.x, focalY: focal.y });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved({ ...photo, focalX: focal.x, focalY: focal.y, alt: alt.trim() || null });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="focal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 p-4 sm:p-8"
    >
      <div className="mx-auto max-w-4xl space-y-6 bg-paper p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h3 id="focal-title" className="font-display text-2xl">
            Adjust photo
          </h3>
          <button type="button" className={buttonClasses("quiet")} onClick={onClose}>
            Close
          </button>
        </div>
        <p className="text-ink-muted">
          Tap the most important part of the photo, such as the animal&apos;s head. Every crop below keeps it in view.
        </p>
        <button
          type="button"
          className="relative block w-full cursor-crosshair"
          aria-label="Choose the focal point"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setFocal({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
          }}
          onKeyDown={(e) => {
            const step = 0.05;
            const moves: Record<string, [number, number]> = {
              ArrowLeft: [-step, 0],
              ArrowRight: [step, 0],
              ArrowUp: [0, -step],
              ArrowDown: [0, step],
            };
            const m = moves[e.key];
            if (!m) return;
            e.preventDefault();
            setFocal((f) => ({ x: Math.min(1, Math.max(0, f.x + m[0])), y: Math.min(1, Math.max(0, f.y + m[1])) }));
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="block max-h-[55vh] w-full object-contain" draggable={false} />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgb(0_0_0/0.4)]"
            style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
          />
        </button>
        <div className="grid grid-cols-[2fr_1.4fr_1fr] items-end gap-3">
          {[
            ["Homepage (wide)", "aspect-[21/9]"],
            ["Cards", "aspect-[4/3]"],
            ["Phones", "aspect-[4/5]"],
          ].map(([label, ratio]) => (
            <figure key={label}>
              <div className={clsx("overflow-hidden bg-surface", ratio)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-full object-cover" style={{ objectPosition: position }} />
              </div>
              <figcaption className="mt-1 text-xs text-ink-muted">{label}</figcaption>
            </figure>
          ))}
        </div>
        <div className="max-w-xl space-y-1.5">
          <label htmlFor="photo-alt" className="block text-sm font-semibold">
            Photo description (for screen readers and search engines)
          </label>
          <TextInput
            id="photo-alt"
            value={alt}
            maxLength={300}
            onChange={(e) => setAlt(e.target.value)}
            placeholder={`${animalName}, …`}
          />
        </div>
        <FormMessage>{error}</FormMessage>
        <div className="flex gap-3">
          <button type="button" className={buttonClasses("primary")} onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className={buttonClasses("secondary")} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
