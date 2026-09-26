import sharp from "sharp";
import exifr from "exifr";

/** Widths generated for every photo (never upscaled). */
export const VARIANT_WIDTHS = [320, 640, 960, 1280, 1920, 2560] as const;

export type ProcessedImage = {
  width: number;
  height: number;
  variants: { width: number; height: number; data: Buffer }[];
  blurDataUrl: string;
  takenAt: string | null;
};

/**
 * Turns one uploaded photo into web-ready WebP sizes plus a tiny blurred
 * placeholder. Orientation is corrected and all metadata (including GPS
 * location) is stripped from the published files.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const takenAt = await readTakenAt(input);
  const base = sharp(input, { failOn: "error", limitInputPixels: 80_000_000 }).rotate();
  const meta = await base.clone().metadata();
  // After .rotate(), EXIF orientations 5–8 swap width and height.
  const swap = (meta.orientation ?? 1) >= 5;
  const width = (swap ? meta.height : meta.width) ?? 0;
  const height = (swap ? meta.width : meta.height) ?? 0;
  if (!width || !height) throw new Error("That file doesn't look like a photo.");

  const widths = [...VARIANT_WIDTHS.filter((w) => w < width), Math.min(width, VARIANT_WIDTHS.at(-1)!)];
  const unique = [...new Set(widths)];
  const variants = await Promise.all(
    unique.map(async (w) => {
      const { data, info } = await base
        .clone()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 78, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      return { width: info.width, height: info.height, data };
    }),
  );

  const blur = await base.clone().resize({ width: 16 }).blur(1).webp({ quality: 40 }).toBuffer();
  return { width, height, variants, blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`, takenAt };
}

/** When the photo was taken, from EXIF, if present and plausible. */
export async function readTakenAt(input: Buffer): Promise<string | null> {
  try {
    const exif = await exifr.parse(input, { pick: ["DateTimeOriginal", "CreateDate"] });
    const d: unknown = exif?.DateTimeOriginal ?? exif?.CreateDate;
    if (
      d instanceof Date &&
      !Number.isNaN(d.getTime()) &&
      d.getFullYear() >= 1990 &&
      d.getTime() <= Date.now() + 86_400_000
    ) {
      return d.toISOString();
    }
  } catch {
    // No or unreadable EXIF: fine, the owner picks the date.
  }
  return null;
}
