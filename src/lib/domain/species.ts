/**
 * Species vocabulary. Owned by Elevartemis (code, not database) so every
 * ranch gets consistent, correct terminology. Adding a species means one
 * entry here plus its categories in a migration.
 */
export type Species = "horse" | "cattle";

export type SpeciesTerms = {
  singular: string;
  plural: string;
  /** URL segment: /horses/…, /cattle/… */
  path: string;
  /** "Foaled 2026" / "Calved 2026" */
  birthVerb: string;
  /** Heading for offspring on a parent's portfolio. */
  offspringHeading: string;
  /** Page for program_status = 'reference'. */
  referenceHeading: string;
  referencePath: string;
  retiredHeading: string;
  standingLabel: string;
};

export const speciesTerms: Record<Species, SpeciesTerms> = {
  horse: {
    singular: "Horse",
    plural: "Horses",
    path: "horses",
    birthVerb: "Foaled",
    offspringHeading: "Offspring",
    referenceHeading: "Previous Stallions",
    referencePath: "previous-stallions",
    retiredHeading: "Retired",
    standingLabel: "Standing at stud",
  },
  cattle: {
    singular: "Cattle",
    plural: "Cattle",
    path: "cattle",
    birthVerb: "Calved",
    offspringHeading: "Progeny",
    referenceHeading: "Reference Sires",
    referencePath: "reference-sires",
    retiredHeading: "Retired",
    standingLabel: "Available for breeding",
  },
};

export type BirthPrecision = "year" | "month" | "day";

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

/**
 * Formats a stored birth date at the precision the owner entered.
 * Parses the ISO date directly, so there are no time-zone shifts.
 *   ("2026-04-02", "day")  → "April 2, 2026"
 *   ("2026-05-01", "month")→ "May 2026"
 *   ("2026-01-01", "year") → "2026"
 */
export function formatBirthDate(iso: string | null | undefined, precision: BirthPrecision): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  if (precision === "year") return y;
  const month = MONTHS[Number(mo) - 1];
  if (!month) return null;
  if (precision === "month") return `${month} ${y}`;
  return `${month} ${Number(d)}, ${y}`;
}

/** "Foaled April 2, 2026" or null when the date is unknown. */
export function birthLine(species: Species, iso: string | null | undefined, precision: BirthPrecision): string | null {
  const date = formatBirthDate(iso, precision);
  return date ? `${speciesTerms[species].birthVerb} ${date}` : null;
}
