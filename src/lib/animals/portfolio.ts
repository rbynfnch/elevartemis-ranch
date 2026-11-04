/**
 * What an animal's public page shows, worked out from the stored data.
 * Every function returns only what exists: no blank labels, no "N/A".
 */
import type { Species } from "@/lib/domain/species";
import { compactFacts, isBlank, richTextIsEmpty } from "@/lib/content/empty";
import { epdLabel, type EpdEntry } from "@/lib/animals/epd";
import { formatMoney } from "@/lib/animals/breeding";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type Precision = "year" | "month" | "day";

/** "2019-05-03" shown only as precisely as the owner knows it: "2019", "May 2019" or "May 3, 2019". */
export function formatPartialDate(date: string | null, precision: Precision): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  if (!m) return null;
  const [, year, month, day] = m;
  const monthName = MONTHS[Number(month) - 1];
  if (precision === "year" || !monthName) return year;
  if (precision === "month") return `${monthName} ${year}`;
  return `${monthName} ${Number(day)}, ${year}`;
}

const sexWords: Record<string, string> = { male: "Male", female: "Female", gelding: "Gelding", steer: "Steer" };

export type PortfolioFactsInput = {
  species: Species;
  breed: string | null;
  color: string | null;
  sex: string;
  birthDate: string | null;
  birthPrecision: Precision;
  registry: string | null;
  registrationNumber: string | null;
  /** The owner's own Quick Facts, in their order. */
  ownerFacts: { label: string; value: string }[];
};

/** The Quick Facts panel: the basics first, then the owner's own lines. */
export function quickFacts(input: PortfolioFactsInput): { label: string; value: string }[] {
  const registration = [input.registry?.trim(), input.registrationNumber?.trim()].filter(Boolean).join(" #");
  const born = formatPartialDate(input.birthDate, input.birthPrecision);
  const basics = compactFacts([
    { label: input.species === "horse" ? "Foaled" : "Calved", value: born },
    { label: "Breed", value: input.breed },
    { label: "Color", value: input.color },
    { label: "Sex", value: sexWords[input.sex] },
    { label: "Registration", value: registration },
  ]);
  // The owner's lines win if they repeat a basic (e.g. their own "Color" wording).
  const own = compactFacts(input.ownerFacts);
  const ownLabels = new Set(own.map((f) => f.label.toLowerCase()));
  return [...basics.filter((f) => !ownLabels.has(f.label.toLowerCase())), ...own];
}

export type SaleInput = {
  status: "available" | "pending" | "sold";
  price_mode: "price" | "contact" | "hidden";
  price_cents: number | null;
  currency: string;
  available_on: string | null;
  location_text: string | null;
  sales_description: unknown;
} | null;

export type SaleDisplay = {
  badge: "For Sale" | "Sale Pending" | "Sold";
  /** The price line, or null when the owner chose not to mention price (or the animal is sold). */
  price: string | null;
  details: { label: string; value: string }[];
  description: unknown;
};

export function saleDisplay(sale: SaleInput): SaleDisplay | null {
  if (!sale) return null;
  if (sale.status === "sold") return { badge: "Sold", price: null, details: [], description: null };
  const price =
    sale.price_mode === "price" && sale.price_cents != null
      ? formatMoney(sale.price_cents, sale.currency)
      : sale.price_mode === "contact"
        ? "Contact for price"
        : null;
  return {
    badge: sale.status === "pending" ? "Sale Pending" : "For Sale",
    price,
    details: compactFacts([
      { label: "Available", value: formatPartialDate(sale.available_on, "day") },
      { label: "Location", value: sale.location_text },
    ]),
    description: richTextIsEmpty(sale.sales_description) ? null : sale.sales_description,
  };
}

export type PerformanceInput = {
  birth_weight_lb: number | null;
  weaning_weight_lb: number | null;
  weaning_weight_adj_lb: number | null;
  yearling_weight_lb: number | null;
  yearling_weight_adj_lb: number | null;
  adg_lb: number | null;
  adg_note: string | null;
  epds: unknown;
  epds_as_of: string | null;
  epds_source: string | null;
} | null;

export type PerformanceDisplay = {
  weights: { label: string; value: string }[];
  epds: { code: string; label: string; value: string; accuracy: string | null; percentile: string | null }[];
  epdNote: string | null;
};

const pounds = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} lb`;
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function performanceDisplay(perf: PerformanceInput): PerformanceDisplay | null {
  if (!perf) return null;
  const adg =
    perf.adg_lb != null
      ? `${perf.adg_lb.toFixed(2)} lb/day${perf.adg_note?.trim() ? ` (${perf.adg_note.trim()})` : ""}`
      : null;
  const weights = compactFacts([
    { label: "Birth weight", value: perf.birth_weight_lb != null ? pounds(perf.birth_weight_lb) : null },
    { label: "Weaning weight", value: perf.weaning_weight_lb != null ? pounds(perf.weaning_weight_lb) : null },
    {
      label: "Adjusted weaning weight (205-day)",
      value: perf.weaning_weight_adj_lb != null ? pounds(perf.weaning_weight_adj_lb) : null,
    },
    { label: "Yearling weight", value: perf.yearling_weight_lb != null ? pounds(perf.yearling_weight_lb) : null },
    {
      label: "Adjusted yearling weight (365-day)",
      value: perf.yearling_weight_adj_lb != null ? pounds(perf.yearling_weight_adj_lb) : null,
    },
    { label: "Average daily gain", value: adg },
  ]);
  const entries = (Array.isArray(perf.epds) ? perf.epds : []) as EpdEntry[];
  const epds = entries
    .filter((e) => e && typeof e.trait === "string" && Number.isFinite(e.value))
    .map((e) => ({
      code: e.trait,
      label: epdLabel(e.trait),
      value: signed(e.value),
      accuracy: e.accuracy != null ? e.accuracy.toFixed(2).replace(/^0/, "") : null,
      percentile: e.percentile != null ? `${e.percentile}%` : null,
    }));
  if (weights.length === 0 && epds.length === 0) return null;
  const asOf = formatPartialDate(perf.epds_as_of, "day");
  const note = [asOf ? `As of ${asOf}` : null, perf.epds_source?.trim() || null].filter(Boolean).join(" · ");
  return { weights, epds, epdNote: epds.length && note ? note : null };
}

type RichNode = { text?: string; content?: RichNode[] };

/** Plain text from a stored rich-text document, trimmed to a sentence-ish length for page descriptions. */
export function plainSummary(doc: unknown, max = 160): string | null {
  if (isBlank(doc) || typeof doc !== "object") return null;
  const parts: string[] = [];
  const walk = (node: RichNode) => {
    if (typeof node.text === "string") parts.push(node.text);
    for (const child of node.content ?? []) walk(child);
    // A boundary between blocks, so words from neighbouring paragraphs don't run together.
    if (node.content) parts.push(" ");
  };
  walk(doc as RichNode);
  const text = parts.join("").replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).trimEnd()}…`;
}

/**
 * "2012 – 2024" for the In Memory page, using only what is known: both years,
 * or "Born 2012" / "Passed 2024", or nothing. The passing date is shown as
 * precisely as the owner entered it ("March 2024").
 */
export function lifespanText(
  birthYear: number | null | undefined,
  deceasedOn: string | null,
  deceasedPrecision: Precision,
): string | null {
  const passed = formatPartialDate(deceasedOn, deceasedPrecision);
  if (birthYear && passed) {
    // Both years in the same style keeps a lifespan readable: "2012 – 2024", or "2012 – March 2024".
    return `${birthYear} – ${passed}`;
  }
  if (passed) return `Passed ${passed}`;
  if (birthYear) return `Born ${birthYear}`;
  return null;
}
