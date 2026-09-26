/**
 * Converting between what owners type and what the database stores.
 * Kept free of server-only imports so they can be unit tested.
 */

/** Trimmed text, or null when blank. */
export function optionalText(value: FormDataEntryValue | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

type Doc = { type: "doc"; content: unknown[] };

/**
 * Plain text → rich-text document. Blank lines start new paragraphs; single
 * line breaks are kept. Returns null for blank input, so nothing empty is
 * ever stored. (A full formatting editor arrives with the post editor.)
 */
export function textToDoc(text: string | null | undefined): Doc | null {
  const paragraphs = (text ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;
  return {
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: p
        .split("\n")
        .flatMap((line, i) => [
          ...(i > 0 ? [{ type: "hardBreak" }] : []),
          ...(line.trim() ? [{ type: "text", text: line.trim() }] : []),
        ]),
    })),
  };
}

type Node = { type?: string; text?: string; content?: Node[] };

/** Rich-text document → plain text for editing in a text box. */
export function docToText(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  const blocks: string[] = [];
  const inline = (n: Node): string =>
    n.type === "text" ? (n.text ?? "") : n.type === "hardBreak" ? "\n" : (n.content ?? []).map(inline).join("");
  const walk = (n: Node) => {
    if (["paragraph", "heading", "listItem", "blockquote"].includes(n.type ?? "")) {
      const t = inline(n);
      if (t.trim()) blocks.push(t);
      if (n.type !== "paragraph" && n.type !== "heading") return;
      return;
    }
    (n.content ?? []).forEach(walk);
  };
  walk(doc as Node);
  return blocks.join("\n\n");
}

/** "$1,500.50" → 150050. Blank → null. Anything else → NaN (a validation error). */
export function dollarsToCents(value: FormDataEntryValue | null | undefined): number | null {
  const t = optionalText(value);
  if (t === null) return null;
  const cleaned = t.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  const [whole, fraction = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 150050 → "1500.50"; 150000 → "1500"; null → "". */
export function centsToDollars(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export type Precision = "year" | "month" | "day";

/**
 * Birth date as owners know it: just a year, a month and year, or the exact
 * day. Returns an ISO date at that precision, or an error message.
 */
export function parsePartialDate(input: {
  precision: string | null;
  year: string | null;
  month?: string | null;
  day?: string | null;
}): { date: string | null; precision: Precision } | { error: string } {
  const precision: Precision = input.precision === "year" || input.precision === "month" ? input.precision : "day";
  const year = optionalText(input.year);
  if (!year) return { date: null, precision };
  if (!/^\d{4}$/.test(year)) return { error: "Enter a four-digit year." };
  const y = Number(year);
  const thisYear = new Date().getUTCFullYear();
  if (y < 1900 || y > thisYear + 1) return { error: `Enter a year between 1900 and ${thisYear + 1}.` };
  if (precision === "year") return { date: `${year}-01-01`, precision };

  const m = Number(optionalText(input.month));
  if (!Number.isInteger(m) || m < 1 || m > 12) return { error: "Choose a month." };
  const mm = String(m).padStart(2, "0");
  if (precision === "month") return { date: `${year}-${mm}-01`, precision };

  const d = Number(optionalText(input.day));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (!Number.isInteger(d) || d < 1 || d > daysInMonth) return { error: "Enter a valid day for that month." };
  return { date: `${year}-${mm}-${String(d).padStart(2, "0")}`, precision };
}

/** Optional number in a range; blank → null; bad input → NaN. */
export function optionalNumber(value: FormDataEntryValue | null | undefined): number | null {
  const t = optionalText(value);
  if (t === null) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : Number.NaN;
}
