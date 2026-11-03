import { createBrowserSupabase } from "@/lib/supabase/browser";
import { prepareUpload } from "@/lib/media/prepare-upload";
import { finishPhotoUploadAction, startPhotoUploadAction } from "@/lib/admin/animals/actions";

/** Uploads one photo to the Photo Library (no animal). Resolves to its media id; throws a plain-language Error. */
export async function uploadToLibrary(file: File): Promise<string> {
  const { blob, takenAt } = await prepareUpload(file);
  const start = await startPhotoUploadAction();
  if (!start.ok) throw new Error(start.message);
  const { error } = await createBrowserSupabase()
    .storage.from("ranch-originals")
    .uploadToSignedUrl(start.data.path, start.data.token, blob, { contentType: "image/jpeg" });
  if (error) throw new Error(`${file.name} didn't upload. Check your connection and try again.`);
  const finish = await finishPhotoUploadAction({
    mediaId: start.data.mediaId,
    animalId: null,
    fileName: file.name,
    takenAt,
    altText: null,
  });
  if (!finish.ok) throw new Error(finish.message);
  return start.data.mediaId;
}

export const isImageFile = (f: File) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);
