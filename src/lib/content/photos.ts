/** Photos placed inside written text (an `image` node that names a Photo Library photo by id). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Node = { type?: string; attrs?: Record<string, unknown>; content?: Node[] };

export const isPhotoId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** The photo ids a document uses, in order, without repeats. Anything that isn't a real id is ignored. */
export function collectPhotoIds(doc: unknown): string[] {
  const ids: string[] = [];
  const walk = (node: Node | undefined) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "image" && isPhotoId(node.attrs?.mediaId) && !ids.includes(node.attrs.mediaId))
      ids.push(node.attrs.mediaId);
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc as Node);
  return ids;
}

/** How many photo spots a document has, and how many of them name no real photo (so would never show). */
export function countPhotoSpots(doc: unknown): { total: number; broken: number } {
  let total = 0;
  let broken = 0;
  const walk = (node: Node | undefined) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "image") {
      total += 1;
      if (!isPhotoId(node.attrs?.mediaId)) broken += 1;
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc as Node);
  return { total, broken };
}

/** The same document without photo spots that name no real photo. Nothing else changes. */
export function stripBrokenPhotos<T>(doc: T): T {
  const clean = (node: unknown): unknown => {
    if (!node || typeof node !== "object") return node;
    const n = node as Node;
    if (!Array.isArray(n.content)) return n;
    const content = n.content
      .filter(
        (child) => !(child && typeof child === "object" && child.type === "image" && !isPhotoId(child.attrs?.mediaId)),
      )
      .map(clean);
    return { ...n, content };
  };
  return clean(doc) as T;
}
