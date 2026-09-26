/**
 * Browser-side photo preparation: read when it was taken, then shrink large
 * phone photos to at most 3000 px before upload — much faster on rural
 * connections, and plenty for every size the website uses.
 */
import exifr from "exifr";

export const MAX_UPLOAD_EDGE = 3000;

export async function readTakenAtInBrowser(file: File): Promise<string | null> {
  try {
    const exif = await exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate"] });
    const d: unknown = exif?.DateTimeOriginal ?? exif?.CreateDate;
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  } catch {
    return null;
  }
}

export async function prepareUpload(file: File): Promise<{ blob: Blob; takenAt: string | null }> {
  const takenAt = await readTakenAtInBrowser(file);
  let bitmap: ImageBitmap;
  try {
    // Applies the phone's rotation so the photo is upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      `${file.name} couldn't be opened. If it's an iPhone HEIC photo, choose it from the Photos app (it converts automatically) or export it as JPEG.`,
    );
  }
  const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error(`${file.name} couldn't be prepared for upload.`);
  return { blob, takenAt };
}
