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
