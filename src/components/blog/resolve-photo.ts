import { mediaUrl } from "@/lib/media/variants";
import { isPhotoId } from "@/lib/content/photos";
import type { TextPhoto, TextPhotos } from "@/lib/content/rich-text";

/**
 * The photo a block points at: the one the page looked up, or, if it couldn't be looked up, the small preview saved with
 * the block, but only when that preview is a file in this site's own photo storage.
 */
export function resolveTextPhoto(id: unknown, thumb: unknown, photos?: TextPhotos): TextPhoto | null {
  const found = isPhotoId(id) ? photos?.[id] : null;
  if (found) return found;
  const preview = typeof thumb === "string" ? thumb : "";
  let base = "";
  try {
    base = mediaUrl("");
  } catch {
    base = "";
  }
  return base && preview.startsWith(base) && !/\s/.test(preview)
    ? { src: preview, srcSet: "", alt: "", focalX: 0.5, focalY: 0.5 }
    : null;
}
