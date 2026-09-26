import { richTextIsEmpty } from "@/lib/content/empty";

export type FaqRow = {
  id: string;
  question: string;
  answer: unknown;
  group_label: string | null;
  sort_order: number;
  is_published?: boolean;
};

export type FaqGroup = { label: string | null; items: FaqRow[] };

/**
 * Groups FAQs for the public page (e.g. Horses, Cattle, General).
 *
 * - Groups appear in the order of their first question, so the owner controls
 *   group order just by ordering questions.
 * - Unpublished questions, blank questions and empty answers are dropped, and
 *   a group with nothing left doesn't appear — no empty headings.
 * - If only one group remains, its heading is dropped too (label: null).
 */
export function groupFaqs(rows: FaqRow[]): FaqGroup[] {
  const visible = rows
    .filter((r) => r.is_published !== false && r.question.trim() && !richTextIsEmpty(r.answer))
    .sort((a, b) => a.sort_order - b.sort_order);

  const groups: FaqGroup[] = [];
  for (const row of visible) {
    const label = row.group_label?.trim() || null;
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(row);
    else groups.push({ label, items: [row] });
  }
  return groups.length === 1 ? [{ label: null, items: groups[0].items }] : groups;
}
