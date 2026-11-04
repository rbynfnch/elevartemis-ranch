"use client";

import { useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { isImageFile, uploadToLibrary } from "./upload";

/**
 * Uploading photos from inside a picker. Files go to the Photo Library one at a time (so a slow phone
 * connection shows steady progress); `onDone` gets the ids of the ones that worked. Problems are listed
 * in plain words and never stop the other photos.
 */
export function usePhotoUpload(onDone: (ids: string[]) => void | Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [problems, setProblems] = useState<string[]>([]);

  async function upload(files: File[]) {
    const images = files.filter(isImageFile);
    const skipped = files.length - images.length;
    if (images.length === 0) {
      setProblems(files.length ? ["Only photos can be uploaded here (JPG, PNG, HEIC or WebP)."] : []);
      return;
    }
    setBusy(true);
    setProblems(
      skipped ? [`${skipped} ${skipped === 1 ? "file was" : "files were"} not a photo and was skipped.`] : [],
    );
    const ids: string[] = [];
    for (const [i, file] of images.entries()) {
      setStatus(images.length > 1 ? `Uploading ${i + 1} of ${images.length}…` : "Uploading…");
      try {
        ids.push(await uploadToLibrary(file));
      } catch (e) {
        setProblems((p) => [...p, e instanceof Error ? e.message : `${file.name} didn't upload.`]);
      }
    }
    setStatus("");
    setBusy(false);
    if (ids.length) await onDone(ids);
  }

  return { busy, status, problems, upload };
}

/** The "Upload photos" button for a picker's header. */
export function UploadButton({
  busy,
  status,
  upload,
  className,
}: {
  busy: boolean;
  status: string;
  upload: (files: File[]) => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        className={buttonClasses("primary", className ?? "py-2")}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? status || "Uploading…" : "Upload photos"}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose photos to upload"
        onChange={(e) => {
          upload(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </>
  );
}
