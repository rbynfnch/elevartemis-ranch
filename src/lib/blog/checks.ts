import { isEmptyDoc, type DocNode } from "./content";

export type Check = { level: "required" | "suggest"; text: string };

/** Photos in the story that have no description (for people who can't see them). */
export function photosWithoutDescription(doc: unknown): number {
  let n = 0;
  const walk = (node: DocNode | undefined) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "image" && !(typeof node.attrs?.alt === "string" && node.attrs.alt.trim())) n++;
    if (node.type === "gallery" && Array.isArray(node.attrs?.items))
      for (const it of node.attrs.items as { alt?: unknown }[])
        if (!(typeof it?.alt === "string" && it.alt.trim())) n++;
    for (const c of node.content ?? []) walk(c);
  };
  walk(doc as DocNode);
  return n;
}

/** What to look at before publishing. "Required" blocks publishing; "suggest" is friendly advice. */
export function publishChecks(p: {
  title: string;
  body: unknown;
  excerpt: string;
  featuredMediaId: string | null;
  categoryId: string | null;
  metaDescription: string;
}): Check[] {
  const out: Check[] = [];
  if (!p.title.trim()) out.push({ level: "required", text: "Give the post a title." });
  if (isEmptyDoc(p.body)) out.push({ level: "required", text: "Write something in the story." });
  if (!p.featuredMediaId) out.push({ level: "suggest", text: "Choose a featured photo. It shows on the list and when shared." });
  if (!p.excerpt.trim()) out.push({ level: "suggest", text: "Add a short summary for the list and for sharing." });
  if (!p.categoryId) out.push({ level: "suggest", text: "Pick a category so visitors can find it." });
  if (!p.metaDescription.trim()) out.push({ level: "suggest", text: "Add a search description (or let the summary stand in)." });
  const missing = photosWithoutDescription(p.body);
  if (missing) out.push({ level: "suggest", text: `${missing} photo${missing === 1 ? " has" : "s have"} no description yet.` });
  return out;
}
