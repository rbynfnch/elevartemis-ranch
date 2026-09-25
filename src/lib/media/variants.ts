import { publicEnv } from "@/lib/env";

export type Variant = { path: string; w: number; h: number };

/** Parses media.variants ({"640": {path,w,h}, …}) into a width-sorted list. */
export function parseVariants(raw: unknown): Variant[] {
  if (!raw || typeof raw !== "object") return [];
  return Object.values(raw as Record<string, unknown>)
    .filter(
      (v): v is Variant =>
        !!v &&
        typeof v === "object" &&
        typeof (v as Variant).path === "string" &&
        typeof (v as Variant).w === "number" &&
        typeof (v as Variant).h === "number",
    )
    .sort((a, b) => a.w - b.w);
}

/** Smallest variant at least `minWidth` wide, else the largest available. */
export function pickVariant(raw: unknown, minWidth: number): Variant | null {
  const list = parseVariants(raw);
  if (list.length === 0) return null;
  return list.find((v) => v.w >= minWidth) ?? list[list.length - 1];
}

/** Public CDN URL for a derivative in the ranch-media bucket. */
export function mediaUrl(path: string): string {
  return `${publicEnv().supabaseUrl}/storage/v1/object/public/ranch-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** srcset string from all variants: "…/320.webp 320w, …/640.webp 640w". */
export function srcSet(raw: unknown): string {
  return parseVariants(raw)
    .map((v) => `${mediaUrl(v.path)} ${v.w}w`)
    .join(", ");
}
