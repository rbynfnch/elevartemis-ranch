/**
 * EPD traits offered in the admin. A starter list of widely reported traits;
 * the owner can also type any other trait code their breed association
 * publishes. Values are stored exactly as entered on the association's report.
 */
export const commonEpdTraits: { code: string; label: string }[] = [
  { code: "CED", label: "Calving Ease Direct" },
  { code: "BW", label: "Birth Weight" },
  { code: "WW", label: "Weaning Weight" },
  { code: "YW", label: "Yearling Weight" },
  { code: "MM", label: "Maternal Milk" },
  { code: "M&G", label: "Milk & Growth" },
  { code: "SC", label: "Scrotal Circumference" },
  { code: "CW", label: "Carcass Weight" },
  { code: "REA", label: "Ribeye Area" },
  { code: "MARB", label: "Marbling" },
  { code: "FAT", label: "Fat" },
];

export type EpdEntry = { trait: string; value: number; accuracy?: number; percentile?: number };

export function epdLabel(code: string): string {
  return commonEpdTraits.find((t) => t.code === code)?.label ?? code;
}

/** Validates EPD rows from the form; blank rows are dropped. */
export function parseEpdRows(
  rows: { trait: string; value: string; accuracy?: string; percentile?: string }[],
): { epds: EpdEntry[] } | { error: string } {
  const epds: EpdEntry[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const trait = row.trait.trim().toUpperCase().slice(0, 12);
    const valueText = row.value.trim();
    if (!trait && !valueText) continue;
    if (!trait) return { error: "Each EPD needs a trait." };
    if (seen.has(trait)) return { error: `${trait} is listed twice.` };
    seen.add(trait);
    const value = Number(valueText);
    if (!valueText || !Number.isFinite(value)) return { error: `Enter a number for ${trait}.` };
    const entry: EpdEntry = { trait, value };
    if (row.accuracy?.trim()) {
      const acc = Number(row.accuracy);
      if (!Number.isFinite(acc) || acc < 0 || acc > 1) return { error: `${trait} accuracy should be between 0 and 1 (for example .45).` };
      entry.accuracy = acc;
    }
    if (row.percentile?.trim()) {
      const pct = Number(row.percentile.replace("%", ""));
      if (!Number.isInteger(pct) || pct < 1 || pct > 100) return { error: `${trait} percentile rank should be 1–100.` };
      entry.percentile = pct;
    }
    epds.push(entry);
  }
  return { epds };
}
