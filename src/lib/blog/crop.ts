import type { Aspect } from "./content";

/** The shape a photo is shown in. "Original" keeps the photo's own shape. */
export const aspectLabels: Record<Aspect, string> = {
  original: "Original",
  "16:9": "Wide (16:9)",
  "4:3": "Standard (4:3)",
  "3:2": "Photo (3:2)",
  "1:1": "Square (1:1)",
  "4:5": "Tall (4:5)",
};

export const aspectRatio = (a: Aspect): string | undefined => (a === "original" ? undefined : a.replace(":", " / "));

export type CropView = { aspect: Aspect; zoom: number; focalX: number; focalY: number };

/**
 * How to show a photo in a chosen shape without touching the file: the frame takes the shape, the photo fills it,
 * `focal` decides which part stays in view and `zoom` moves in closer around that point. Restoring the original is
 * simply "original, 1x, centered".
 */
export function cropStyles(v: CropView): {
  frame: { aspectRatio?: string; overflow?: "hidden" };
  img: { objectFit?: "cover"; objectPosition?: string; transform?: string; transformOrigin?: string };
} {
  const shaped = v.aspect !== "original";
  const zoomed = v.zoom > 1.001;
  const pos = `${Math.round(v.focalX * 100)}% ${Math.round(v.focalY * 100)}%`;
  return {
    frame: {
      ...(shaped ? { aspectRatio: aspectRatio(v.aspect) } : {}),
      ...(shaped || zoomed ? { overflow: "hidden" as const } : {}),
    },
    img: {
      ...(shaped ? { objectFit: "cover" as const, objectPosition: pos } : {}),
      ...(zoomed ? { transform: `scale(${v.zoom.toFixed(2)})`, transformOrigin: pos } : {}),
    },
  };
}

export const isUncropped = (v: CropView) =>
  v.aspect === "original" && v.zoom <= 1.001 && Math.abs(v.focalX - 0.5) < 0.001 && Math.abs(v.focalY - 0.5) < 0.001;
