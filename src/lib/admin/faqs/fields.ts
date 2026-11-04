/** Rules for a question and its answer as typed into the editor. Pure, so they are easy to test. */
export type FaqInput = {
  id: string | null;
  question: string;
  answer: unknown;
  group: string;
  isPublished: boolean;
};

const squash = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);

export type TidyFaq = { question: string; group_label: string | null; is_published: boolean };

export function tidyFaqs(
  items: FaqInput[],
  isBlank: (doc: unknown) => boolean,
): { ok: true; items: TidyFaq[] } | { ok: false; message: string } {
  if (items.length > 100) return { ok: false, message: "That's a lot of questions. Keep it to 100 or fewer." };
  const out: TidyFaq[] = [];
  for (const [i, f] of items.entries()) {
    const question = squash(f.question, 300);
    if (!question) return { ok: false, message: `Question ${i + 1} needs some words.` };
    if (isBlank(f.answer)) return { ok: false, message: `Write an answer for “${question.slice(0, 40)}”.` };
    out.push({ question, group_label: squash(f.group, 60) || null, is_published: f.isPublished });
  }
  return { ok: true, items: out };
}
