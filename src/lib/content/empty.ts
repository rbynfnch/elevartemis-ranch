/**
 * The "never display empty information" rule, in one place.
 *
 * Public components build their content from these helpers and render
 * nothing when the result is empty: no blank labels, no empty headings,
 * no "N/A".
 */

/** True for null/undefined, empty or whitespace-only strings, and empty arrays. */
export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function present<T>(value: T | null | undefined): value is T {
  return !isBlank(value);
}

type RichNode = { type?: string; text?: string; content?: RichNode[] };

/**
 * Mirrors private.rich_text_is_empty() in the database: a Tiptap document is
 * empty unless it contains visible text or an image.
 */
export function richTextIsEmpty(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return true;
  const stack: RichNode[] = [doc as RichNode];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.type === "image") return false;
    if (typeof node.text === "string" && node.text.trim()) return false;
    if (Array.isArray(node.content)) stack.push(...node.content);
  }
  return true;
}

export type Fact = { label: string; value: string | number | null | undefined };

/** Drops facts without a value and trims the rest. */
export function compactFacts(facts: Fact[]): { label: string; value: string }[] {
  return facts
    .filter((f) => !isBlank(f.label) && !isBlank(typeof f.value === "number" ? String(f.value) : f.value))
    .map((f) => ({ label: f.label.trim(), value: String(f.value).trim() }));
}

/** Joins present parts, e.g. meta lines. Returns null if nothing remains. */
export function joinPresent(parts: Array<string | number | null | undefined>, separator = ", "): string | null {
  const kept = parts.filter((p) => !isBlank(typeof p === "number" ? String(p) : p)).map(String);
  return kept.length ? kept.join(separator) : null;
}
