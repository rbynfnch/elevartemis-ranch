import type { Species } from "@/lib/domain/species";
import { richTextIsEmpty } from "@/lib/content/empty";

/**
 * Public "Breeding Services" presentation for a stallion (or AI bull).
 * Everything is optional; this returns only what the owner filled in, so the
 * portfolio never shows an empty label, heading or section.
 */
export type BreedingRow = {
  status: "available" | "private_treaty" | "retired";
  stud_fee_cents: number | null;
  booking_fee_cents: number | null;
  collection_fee_cents: number | null;
  currency: string;
  breeding_season: string | null;
  service_types: string[];
  service_type_other: string | null;
  shipping_info: unknown;
  female_requirements: unknown;
  live_offspring_guarantee: boolean | null;
  live_offspring_guarantee_terms: string | null;
  contract_url: string | null;
  additional_terms: unknown;
  cta_label: string | null;
  cta_url: string | null;
};

export type BreedingDisplay = {
  badge: string;
  /** Short label/value lines (fees, season, service types, guarantee). */
  facts: { label: string; value: string }[];
  /** Longer rich-text blocks, each with its own heading. */
  sections: { heading: string; body: unknown }[];
  contract: { href: string; label: string } | null;
  /** href null = open this animal's inquiry form with "breeding" as the topic. */
  cta: { label: string; href: string | null } | null;
  /** False when there's nothing beyond the badge and button: skip the section heading. */
  hasDetails: boolean;
};

const serviceLabels: Record<string, string> = {
  live_cover: "Live cover",
  fresh: "Fresh semen",
  cooled: "Cooled semen",
  frozen: "Frozen semen",
};

const wording: Record<Species, { available: string; female: string; guarantee: string; stud: string }> = {
  horse: {
    available: "Standing at Stud",
    female: "Mare requirements",
    guarantee: "Live foal guarantee",
    stud: "Stud fee",
  },
  cattle: {
    available: "Available for Breeding",
    female: "Cow requirements",
    guarantee: "Live calf guarantee",
    stud: "Breeding fee",
  },
};

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function clean(text: string | null | undefined): string | null {
  const t = text?.trim();
  return t ? t : null;
}

export function breedingDisplay(
  species: Species,
  breedingAvailable: boolean,
  row: BreedingRow | null,
  contractDocumentUrl?: string | null,
): BreedingDisplay | null {
  if (!breedingAvailable) return null;
  const words = wording[species];
  const status = row?.status ?? "available";

  if (status === "retired") {
    // Retired sires keep their story, but fees and booking no longer apply.
    const terms =
      row && !richTextIsEmpty(row.additional_terms)
        ? [{ heading: "Breeding information", body: row.additional_terms }]
        : [];
    return {
      badge: "Retired from Breeding",
      facts: [],
      sections: terms,
      contract: null,
      cta: null,
      hasDetails: terms.length > 0,
    };
  }

  const facts: { label: string; value: string }[] = [];
  const currency = row?.currency ?? "USD";
  if (row?.stud_fee_cents != null) facts.push({ label: words.stud, value: formatMoney(row.stud_fee_cents, currency) });
  else if (status === "private_treaty") facts.push({ label: words.stud, value: "Private treaty" });
  if (row?.booking_fee_cents != null)
    facts.push({ label: "Booking fee", value: formatMoney(row.booking_fee_cents, currency) });
  if (row?.collection_fee_cents != null)
    facts.push({ label: "Collection fee", value: formatMoney(row.collection_fee_cents, currency) });
  const season = clean(row?.breeding_season);
  if (season) facts.push({ label: "Breeding season", value: season });

  const services = (row?.service_types ?? [])
    .map((t) => (t === "other" ? clean(row?.service_type_other) : serviceLabels[t]))
    .filter((s): s is string => Boolean(s));
  if (services.length) facts.push({ label: "Available as", value: services.join(", ") });

  if (row?.live_offspring_guarantee != null) {
    const terms = clean(row.live_offspring_guarantee_terms);
    const base = row.live_offspring_guarantee ? "Yes" : "No";
    facts.push({ label: words.guarantee, value: terms ? `${base}. ${terms}` : base });
  }

  const sections: { heading: string; body: unknown }[] = [];
  if (row && !richTextIsEmpty(row.shipping_info)) sections.push({ heading: "Shipping", body: row.shipping_info });
  if (row && !richTextIsEmpty(row.female_requirements))
    sections.push({ heading: words.female, body: row.female_requirements });
  if (row && !richTextIsEmpty(row.additional_terms))
    sections.push({ heading: "Breeding terms", body: row.additional_terms });

  const contractHref = contractDocumentUrl || clean(row?.contract_url);
  const contract = contractHref ? { href: contractHref, label: "Breeding contract" } : null;

  return {
    badge: words.available,
    facts,
    sections,
    contract,
    cta: { label: clean(row?.cta_label) ?? "Ask about breeding", href: clean(row?.cta_url) },
    hasDetails: facts.length > 0 || sections.length > 0 || contract !== null,
  };
}
