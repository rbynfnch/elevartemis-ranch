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

/** Validates a name the owner typed when renaming. */
export function checkFileName(raw: string): { ok: true; name: string } | { ok: false; message: string } {
  const name = cleanFileName(raw);
  if (!name) return { ok: false, message: "Enter a file name." };
  if (/[\\/]/.test(raw.trim())) return { ok: false, message: "A file name can't contain slashes." };
  if (!/\.[A-Za-z0-9]{2,5}$/.test(name)) return { ok: false, message: "End the name with .jpg, .png or similar." };
  return { ok: true, name };
}
