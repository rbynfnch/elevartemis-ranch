/**
 * Photo file names: what the owner sees in the Photo Library and types in a
 * spreadsheet. Kept to a plain, portable shape so a name copied from the
 * library always matches what the spreadsheet importer looks up.
 */

/** "C:\\Photos\\Stallion 1.JPG" → "Stallion 1.JPG": drop folders, control characters and surrounding space. */
export function cleanFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  return base
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 200);
}

/** Lower-case comparison key; names are unique per ranch ignoring capitals. */
export function fileNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * The name to store for an upload: the original name, or "name-2.jpg",
 * "name-3.jpg"… when the ranch already has that one. Photos with no usable
 * name become "photo.jpg".
 */
export function uniqueFileName(desired: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map(fileNameKey));
  const cleaned = cleanFileName(desired) || "photo.jpg";
  if (!used.has(fileNameKey(cleaned))) return cleaned;
  const dot = cleaned.lastIndexOf(".");
  const stem = dot > 0 ? cleaned.slice(0, dot) : cleaned;
  const ext = dot > 0 ? cleaned.slice(dot) : "";
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${stem.slice(0, 200 - ext.length - String(n).length - 1)}-${n}${ext}`;
    if (!used.has(fileNameKey(candidate))) return candidate;
  }
  return `${stem.slice(0, 180)}-${Date.now()}${ext}`;
}

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|heic|heif|avif|tiff?|bmp)$/i;
const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/avif": ".avif",
};

/** "Stallion 1.JPG" → { base: "Stallion 1", ext: ".JPG" }. A name with no image extension has an empty ext. */
export function splitFileName(name: string): { base: string; ext: string } {
  const match = IMAGE_EXTENSION.exec(name);
  return match ? { base: name.slice(0, match.index), ext: match[0] } : { base: name, ext: "" };
}

/** The extension a photo keeps when renamed: the one it already has, else from its file type, else .jpg. */
export function extensionFor(currentName: string | null, mimeType: string | null): string {
  const own = currentName ? splitFileName(currentName).ext : "";
  return own || MIME_EXTENSION[(mimeType ?? "").toLowerCase()] || ".jpg";
}

/**
 * The owner types only the name; the photo's file type is added for them, so
 * nobody needs to know whether a photo is a .jpg or a .png. If they do type an
 * image extension it is ignored in favour of the real one.
 */
export function checkFileName(raw: string, ext: string): { ok: true; name: string } | { ok: false; message: string } {
  if (/[\\/]/.test(raw.trim())) return { ok: false, message: "A name can't contain slashes." };
  const base = splitFileName(cleanFileName(raw)).base.trim();
  if (!base) return { ok: false, message: "Enter a name." };
  const name = `${base}${ext}`;
  if (name.length > 200) return { ok: false, message: "Use a shorter name." };
  return { ok: true, name };
}
