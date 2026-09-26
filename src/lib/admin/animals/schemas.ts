import {
  dollarsToCents,
  optionalNumber,
  optionalText,
  parsePartialDate,
  textToDoc,
  type Precision,
} from "@/lib/admin/form-values";
import { parseEpdRows, type EpdEntry } from "@/lib/animals/epd";
import type { Database } from "@/lib/database.types";

type Enums = Database["public"]["Enums"];
export type Parsed<T> = { ok: true; data: T } | { ok: false; fieldErrors: Record<string, string> };

const get = (fd: FormData, k: string) => fd.get(k);
const text = (fd: FormData, k: string) => optionalText(fd.get(k));
const checked = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

function oneOf<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

// ─── Basics ──────────────────────────────────────────────────────────────────
export type BasicsInput = {
  species: Enums["species"];
  category_id: string;
  name: string;
  registered_name: string | null;
  sex: Enums["animal_sex"];
  breed: string | null;
  color: string | null;
  registry: string | null;
  registration_number: string | null;
  birth_date: string | null;
  birth_precision: Precision;
  description: ReturnType<typeof textToDoc>;
};

export function parseBasics(fd: FormData): Parsed<BasicsInput> {
  const errors: Record<string, string> = {};
  const species = oneOf(get(fd, "species"), ["horse", "cattle"] as const);
  const name = text(fd, "name");
  const category = text(fd, "category_id");
  const sex = oneOf(get(fd, "sex"), ["male", "female", "gelding", "steer", "unknown"] as const);
  if (!species) errors.species = "Choose horse or cattle.";
  if (!name) errors.name = "Enter a name.";
  else if (name.length > 120) errors.name = "Use 120 characters or fewer.";
  if (!category) errors.category_id = "Choose a category.";
  if (!sex) errors.sex = "Choose the sex.";
  const birth = parsePartialDate({
    precision: text(fd, "birth_precision"),
    year: text(fd, "birth_year"),
    month: text(fd, "birth_month"),
    day: text(fd, "birth_day"),
  });
  if ("error" in birth) errors.birth_date = birth.error;
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  const b = birth as { date: string | null; precision: Precision };
  return {
    ok: true,
    data: {
      species: species!,
      category_id: category!,
      name: name!,
      registered_name: text(fd, "registered_name"),
      sex: sex!,
      breed: text(fd, "breed"),
      color: text(fd, "color"),
      registry: text(fd, "registry"),
      registration_number: text(fd, "registration_number"),
      birth_date: b.date,
      birth_precision: b.precision,
      description: textToDoc(text(fd, "description")),
    },
  };
}

// ─── Website status ──────────────────────────────────────────────────────────
export type StatusInput = {
  is_published: boolean;
  is_featured: boolean;
  program_status: Enums["program_status"];
  deceased_on: string | null;
  deceased_precision: Precision;
};

export function parseStatus(fd: FormData): Parsed<StatusInput> {
  const program = oneOf(get(fd, "program_status"), ["active", "retired", "reference", "deceased"] as const) ?? "active";
  let deceased: { date: string | null; precision: Precision } = { date: null, precision: "year" };
  if (program === "deceased") {
    const d = parsePartialDate({
      precision: text(fd, "deceased_precision") ?? "year",
      year: text(fd, "deceased_year"),
      month: text(fd, "deceased_month"),
      day: text(fd, "deceased_day"),
    });
    if ("error" in d) return { ok: false, fieldErrors: { deceased_on: d.error } };
    deceased = d;
  }
  return {
    ok: true,
    data: {
      is_published: checked(fd, "is_published"),
      is_featured: checked(fd, "is_featured"),
      program_status: program,
      deceased_on: deceased.date,
      deceased_precision: deceased.precision,
    },
  };
}

// ─── For sale ────────────────────────────────────────────────────────────────
export type SaleInput = {
  status: Enums["sale_status"];
  price_mode: Enums["price_mode"];
  price_cents: number | null;
  available_on: string | null;
  location_text: string | null;
  sales_description: ReturnType<typeof textToDoc>;
  show_on_sold_page: boolean;
} | null;

export function parseSale(fd: FormData): Parsed<SaleInput> {
  const status = oneOf(get(fd, "sale_status"), ["none", "available", "pending", "sold"] as const) ?? "none";
  if (status === "none") return { ok: true, data: null };
  const priceMode = oneOf(get(fd, "price_mode"), ["price", "contact", "hidden"] as const) ?? "contact";
  const price = dollarsToCents(get(fd, "price"));
  const errors: Record<string, string> = {};
  if (Number.isNaN(price)) errors.price = "Enter a price in dollars, like 8500.";
  if (priceMode === "price" && price === null) errors.price = "Enter the price, or choose “Contact for price”.";
  const availableOn = text(fd, "available_on");
  if (availableOn && !/^\d{4}-\d{2}-\d{2}$/.test(availableOn)) errors.available_on = "Choose a date.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    data: {
      status,
      price_mode: priceMode,
      price_cents: price,
      available_on: availableOn,
      location_text: text(fd, "location_text"),
      sales_description: textToDoc(text(fd, "sales_description")),
      show_on_sold_page: status === "sold" ? checked(fd, "show_on_sold_page") : true,
    },
  };
}

// ─── Breeding services ───────────────────────────────────────────────────────
export type BreedingInput = {
  breeding_available: boolean;
  row: {
    status: Enums["breeding_status"];
    stud_fee_cents: number | null;
    booking_fee_cents: number | null;
    collection_fee_cents: number | null;
    breeding_season: string | null;
    service_types: string[];
    service_type_other: string | null;
    shipping_info: ReturnType<typeof textToDoc>;
    female_requirements: ReturnType<typeof textToDoc>;
    live_offspring_guarantee: boolean | null;
    live_offspring_guarantee_terms: string | null;
    contract_url: string | null;
    additional_terms: ReturnType<typeof textToDoc>;
    cta_label: string | null;
    cta_url: string | null;
  };
};

const httpsUrl = (v: string | null) => v === null || /^https:\/\/\S+$/i.test(v);

export function parseBreeding(fd: FormData): Parsed<BreedingInput> {
  const errors: Record<string, string> = {};
  const fees = {
    stud_fee_cents: dollarsToCents(get(fd, "stud_fee")),
    booking_fee_cents: dollarsToCents(get(fd, "booking_fee")),
    collection_fee_cents: dollarsToCents(get(fd, "collection_fee")),
  };
  for (const [key, value] of Object.entries(fees)) {
    if (Number.isNaN(value)) errors[key.replace("_cents", "")] = "Enter an amount in dollars, like 1500.";
  }
  const serviceTypes = fd
    .getAll("service_types")
    .filter(
      (v): v is string => typeof v === "string" && ["live_cover", "fresh", "cooled", "frozen", "other"].includes(v),
    );
  const other = text(fd, "service_type_other");
  if (other && !serviceTypes.includes("other")) serviceTypes.push("other");
  const guarantee = get(fd, "live_offspring_guarantee");
  const contractUrl = text(fd, "contract_url");
  const ctaUrl = text(fd, "cta_url");
  if (!httpsUrl(contractUrl)) errors.contract_url = "Use a full link starting with https://";
  if (!httpsUrl(ctaUrl)) errors.cta_url = "Use a full link starting with https://";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    data: {
      breeding_available: checked(fd, "breeding_available"),
      row: {
        status: oneOf(get(fd, "breeding_status"), ["available", "private_treaty", "retired"] as const) ?? "available",
        ...(fees as {
          stud_fee_cents: number | null;
          booking_fee_cents: number | null;
          collection_fee_cents: number | null;
        }),
        breeding_season: text(fd, "breeding_season"),
        service_types: serviceTypes,
        service_type_other: serviceTypes.includes("other") ? other : null,
        shipping_info: textToDoc(text(fd, "shipping_info")),
        female_requirements: textToDoc(text(fd, "female_requirements")),
        live_offspring_guarantee: guarantee === "yes" ? true : guarantee === "no" ? false : null,
        live_offspring_guarantee_terms:
          guarantee === "yes" || guarantee === "no" ? text(fd, "live_offspring_guarantee_terms") : null,
        contract_url: contractUrl,
        additional_terms: textToDoc(text(fd, "additional_terms")),
        cta_label: text(fd, "cta_label"),
        cta_url: ctaUrl,
      },
    },
  };
}

// ─── Cattle performance ──────────────────────────────────────────────────────
export type PerformanceInput = {
  birth_weight_lb: number | null;
  weaning_weight_lb: number | null;
  weaning_weight_adj_lb: number | null;
  yearling_weight_lb: number | null;
  yearling_weight_adj_lb: number | null;
  adg_lb: number | null;
  adg_note: string | null;
  epds: EpdEntry[];
  epds_as_of: string | null;
  epds_source: string | null;
} | null;

const weightFields = {
  birth_weight_lb: [20, 250],
  weaning_weight_lb: [100, 1500],
  weaning_weight_adj_lb: [100, 1500],
  yearling_weight_lb: [200, 2500],
  yearling_weight_adj_lb: [200, 2500],
  adg_lb: [0, 10],
} as const;

export function parsePerformance(fd: FormData): Parsed<PerformanceInput> {
  const errors: Record<string, string> = {};
  const values: Record<string, number | null> = {};
  for (const [key, [min, max]] of Object.entries(weightFields)) {
    const n = optionalNumber(get(fd, key));
    if (Number.isNaN(n)) errors[key] = "Enter a number.";
    else if (n !== null && (n < min || n > max)) errors[key] = `That looks off: expected ${min}–${max}.`;
    values[key] = n;
  }
  const rows = fd.getAll("epd_trait").map((trait, i) => ({
    trait: String(trait),
    value: String(fd.getAll("epd_value")[i] ?? ""),
    accuracy: String(fd.getAll("epd_accuracy")[i] ?? ""),
    percentile: String(fd.getAll("epd_percentile")[i] ?? ""),
  }));
  const epd = parseEpdRows(rows);
  if ("error" in epd) errors.epds = epd.error;
  const asOf = text(fd, "epds_as_of");
  if ("epds" in epd && epd.epds.length && !asOf) errors.epds_as_of = "Add the date these EPDs are from.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };

  const epds = (epd as { epds: EpdEntry[] }).epds;
  const adgNote = text(fd, "adg_note");
  const empty = Object.values(values).every((v) => v === null) && epds.length === 0 && !adgNote;
  if (empty) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      ...(values as Omit<NonNullable<PerformanceInput>, "adg_note" | "epds" | "epds_as_of" | "epds_source">),
      adg_note: adgNote,
      epds,
      epds_as_of: epds.length ? asOf : null,
      epds_source: epds.length ? text(fd, "epds_source") : null,
    },
  };
}

// ─── Quick Facts and story sections (sent as JSON from the editor) ───────────
export type DetailsInput = {
  facts: { label: string; value: string }[];
  sections: { heading: string; body: NonNullable<ReturnType<typeof textToDoc>> }[];
};

export function parseDetails(fd: FormData): Parsed<DetailsInput> {
  try {
    const facts = (JSON.parse(String(get(fd, "facts") ?? "[]")) as { label?: string; value?: string }[])
      .map((f) => ({ label: (f.label ?? "").trim(), value: (f.value ?? "").trim() }))
      .filter((f) => f.label || f.value);
    const sections = (JSON.parse(String(get(fd, "sections") ?? "[]")) as { heading?: string; body?: string }[])
      .map((s) => ({ heading: (s.heading ?? "").trim(), body: textToDoc(s.body ?? "") }))
      .filter((s) => s.heading || s.body);
    const errors: Record<string, string> = {};
    if (facts.some((f) => !f.label || !f.value)) errors.facts = "Each fact needs both a label and a value.";
    if (facts.some((f) => f.label.length > 60)) errors.facts = "Keep fact labels to 60 characters.";
    if (sections.some((s) => !s.heading || !s.body)) errors.sections = "Each section needs a heading and some text.";
    if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
    return { ok: true, data: { facts, sections: sections as DetailsInput["sections"] } };
  } catch {
    return { ok: false, fieldErrors: { facts: "Something went wrong reading the form. Please try again." } };
  }
}
