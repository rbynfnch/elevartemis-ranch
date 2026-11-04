/**
 * Turns the rows of an uploaded spreadsheet into a plan: which animals to add,
 * which to update, and exactly what is wrong with any row that can't be used.
 * Pure functions: the database lookups they need are passed in, so every rule
 * here is covered by unit tests.
 *
 * Rules the owner can rely on:
 *   - A blank cell never erases anything on an existing animal.
 *   - Every problem is reported with its row number and column.
 *   - A photo that isn't in the Photo Library is a warning, not an error: the
 *     animal still imports, and the message says which file to upload.
 */
import type { Species } from "@/lib/domain/species";
import { fileNameKey, splitFileName } from "@/lib/admin/library/file-names";
import type { Csv } from "./csv";
import { HIGHLIGHTS, HIGHLIGHT_MAX, TAGLINE_MAX } from "@/lib/admin/animals/limits";
import { parseVideoUrl } from "@/lib/animals/video";

export const MAX_ROWS = 500;

/** Where the pedigree columns point: sire, dam and the four grandparents (deeper pedigrees have their own import). */
export const pedigreePlaces = [
  { column: "sire", path: "S" },
  { column: "dam", path: "D" },
  { column: "sire_sire", path: "SS" },
  { column: "sire_dam", path: "SD" },
  { column: "dam_sire", path: "DS" },
  { column: "dam_dam", path: "DD" },
] as const;

export const importColumns = [
  "id",
  "name",
  "species",
  "category",
  "sex",
  "breed",
  "color",
  "height",
  "registered_name",
  "registry",
  "registration_number",
  "sire",
  "dam",
  "sire_sire",
  "sire_dam",
  "dam_sire",
  "dam_dam",
  "birth_date",
  "tagline",
  "description",
  "highlights",
  "video_url",
  "status",
  "published",
  "featured",
  "for_sale",
  "price",
  "quick_facts",
  "photos",
] as const;
export type ImportColumn = (typeof importColumns)[number];

/** Rows of the downloadable template that show what each column looks like. They are skipped on upload. */
const EXAMPLE = /^example\b/i;
export const isExampleName = (name: string) => EXAMPLE.test(name.trim());

export const templateExamples: Record<ImportColumn, string>[] = [
  {
    id: "",
    name: "EXAMPLE Horse (delete this row)",
    species: "horse",
    category: "Mare",
    sex: "female",
    breed: "Quarter Horse",
    color: "Bay",
    height: "15.1hh",
    registered_name: "Example Registered Name",
    registry: "AQHA",
    registration_number: "1234567",
    sire: "Example Sire",
    dam: "Example Dam",
    sire_sire: "Example Grandsire",
    sire_dam: "",
    dam_sire: "",
    dam_dam: "Example Granddam",
    birth_date: "2021-04-12",
    tagline: "A short line under the name",
    description: "A sentence or two about this horse.",
    highlights: "Barrel racer; Gentle with kids; Proven producer",
    video_url: "https://www.youtube.com/watch?v=example",
    status: "active",
    published: "yes",
    featured: "no",
    for_sale: "available",
    price: "8500",
    quick_facts: "Height: 15.1 hands; Discipline: Barrel racing",
    photos: "example-mare-front.jpg; example-mare-side.jpg",
  },
  {
    id: "",
    name: "EXAMPLE Bull (delete this row)",
    species: "cattle",
    category: "Bull",
    sex: "",
    breed: "Hereford",
    color: "",
    height: "",
    registered_name: "",
    registry: "",
    registration_number: "",
    sire: "",
    dam: "",
    sire_sire: "",
    sire_dam: "",
    dam_sire: "",
    dam_dam: "",
    birth_date: "2022",
    tagline: "",
    description: "",
    highlights: "",
    video_url: "",
    status: "",
    published: "",
    featured: "",
    for_sale: "",
    price: "",
    quick_facts: "Ear tag: 118",
    photos: "",
  },
];

const aliases: Record<string, ImportColumn> = {
  animal_id: "id",
  animal_name: "name",
  type: "species",
  animal: "species",
  category_name: "category",
  gender: "sex",
  registered: "registered_name",
  registry_name: "registry",
  reg_number: "registration_number",
  registration: "registration_number",
  registration_no: "registration_number",
  father: "sire",
  mother: "dam",
  paternal_grandsire: "sire_sire",
  paternal_granddam: "sire_dam",
  maternal_grandsire: "dam_sire",
  maternal_granddam: "dam_dam",
  dob: "birth_date",
  birthdate: "birth_date",
  birth: "birth_date",
  born: "birth_date",
  foaled: "birth_date",
  calved: "birth_date",
  notes: "description",
  program_status: "status",
  show_on_website: "published",
  on_website: "published",
  show: "published",
  feature: "featured",
  featured_on_homepage: "featured",
  sale: "for_sale",
  sale_status: "for_sale",
  price_usd: "price",
  facts: "quick_facts",
  quickfacts: "quick_facts",
  photo: "photos",
  images: "photos",
  pictures: "photos",
};

export function normaliseHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s\-/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Maps a spreadsheet's header cells to our columns. Unknown columns are reported, never silently used. */
export function mapHeader(header: string[]): { columns: (ImportColumn | null)[]; unknown: string[] } {
  const unknown: string[] = [];
  const seen = new Set<ImportColumn>();
  const columns = header.map((raw) => {
    const key = normaliseHeader(raw);
    const column = (importColumns as readonly string[]).includes(key) ? (key as ImportColumn) : aliases[key];
    if (!column) {
      if (raw.trim()) unknown.push(raw.trim());
      return null;
    }
    if (seen.has(column)) {
      unknown.push(`${raw.trim()} (repeated)`);
      return null;
    }
    seen.add(column);
    return column;
  });
  return { columns, unknown };
}

// ─── Values ──────────────────────────────────────────────────────────────────
const yes = new Set(["yes", "y", "true", "1", "show", "shown", "on", "published", "x"]);
const no = new Set(["no", "n", "false", "0", "hide", "hidden", "off", "unpublished"]);

export function parseYesNo(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (yes.has(v)) return true;
  if (no.has(v)) return false;
  return null;
}

const sexWords: Record<string, string> = {
  male: "male",
  m: "male",
  stallion: "male",
  colt: "male",
  bull: "male",
  female: "female",
  f: "female",
  mare: "female",
  filly: "female",
  cow: "female",
  heifer: "female",
  gelding: "gelding",
  steer: "steer",
  unknown: "unknown",
  "not sure": "unknown",
};
export const parseSex = (raw: string): string | null => sexWords[raw.trim().toLowerCase()] ?? null;

const statusWords: Record<string, "active" | "retired" | "reference" | "deceased"> = {
  active: "active",
  retired: "retired",
  reference: "reference",
  "previous stallion": "reference",
  "reference sire": "reference",
  deceased: "deceased",
  "in memory": "deceased",
  memorial: "deceased",
};
export const parseStatus = (raw: string) => statusWords[raw.trim().toLowerCase()] ?? null;

const saleWords: Record<string, "none" | "available" | "pending" | "sold"> = {
  none: "none",
  no: "none",
  "not for sale": "none",
  available: "available",
  yes: "available",
  "for sale": "available",
  pending: "pending",
  "sale pending": "pending",
  sold: "sold",
};
export const parseSale = (raw: string) => saleWords[raw.trim().toLowerCase()] ?? null;

const monthNames = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** 2019, 2019-05, 2019-05-03, 5/3/2019 (US order) or "May 2019" → a date and how precisely it is known. */
export function parseBirth(raw: string): { date: string; precision: "year" | "month" | "day" } | null {
  const v = raw.trim();
  const valid = (y: number, m: number, d: number) => {
    if (y < 1900 || y > new Date().getFullYear() + 1) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  };
  const pad = (n: number) => String(n).padStart(2, "0");
  let m: RegExpExecArray | null;
  if ((m = /^(\d{4})$/.exec(v))) {
    return valid(+m[1], 1, 1) ? { date: `${m[1]}-01-01`, precision: "year" } : null;
  }
  if ((m = /^(\d{4})-(\d{1,2})$/.exec(v))) {
    return valid(+m[1], +m[2], 1) ? { date: `${m[1]}-${pad(+m[2])}-01`, precision: "month" } : null;
  }
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v))) {
    return valid(+m[1], +m[2], +m[3]) ? { date: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`, precision: "day" } : null;
  }
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v))) {
    return valid(+m[3], +m[1], +m[2]) ? { date: `${m[3]}-${pad(+m[1])}-${pad(+m[2])}`, precision: "day" } : null;
  }
  if ((m = /^([A-Za-z]+)\.?\s+(\d{4})$/.exec(v))) {
    const idx = monthNames.findIndex((n) => n === m![1].toLowerCase() || n.slice(0, 3) === m![1].toLowerCase());
    return idx >= 0 && valid(+m[2], idx + 1, 1) ? { date: `${m[2]}-${pad(idx + 1)}-01`, precision: "month" } : null;
  }
  return null;
}

/** "$8,500", "8500.00" → cents. */
export function parsePrice(raw: string): number | null {
  const v = raw.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  return Math.round(Number(v) * 100);
}

/** "Height: 15.1 hands; Discipline: Barrel racing" (also one per line, or separated by |). */
export function parseFacts(raw: string): { facts: { label: string; value: string }[] } | { error: string } {
  const facts: { label: string; value: string }[] = [];
  for (const part of raw.split(/[;|\r\n]+/)) {
    const text = part.trim();
    if (!text) continue;
    const colon = text.indexOf(":");
    const label = colon > 0 ? text.slice(0, colon).trim() : "";
    const value = colon > 0 ? text.slice(colon + 1).trim() : "";
    if (!label || !value) return { error: `“${text}” should look like Label: value.` };
    if (label.length > 60) return { error: `The label “${label.slice(0, 20)}…” is longer than 60 characters.` };
    if (value.length > 300) return { error: `The value for “${label}” is longer than 300 characters.` };
    facts.push({ label, value });
  }
  return { facts };
}

export const splitList = (raw: string): string[] =>
  raw
    .split(/[;|\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

// ─── Lookups supplied by the caller ──────────────────────────────────────────
export type ImportCategory = {
  id: string;
  species: Species;
  label: string;
  labelPlural: string;
  key: string;
  allowedSexes: string[];
};

export type ImportContext = {
  enabledSpecies: Species[];
  categories: ImportCategory[];
  /** Every ready library photo: its file name and id. */
  photos: { id: string; name: string }[];
  /** This ranch's animals that aren't in Recently Deleted. */
  /** `inMemory` marks an animal whose status is In memory. */
  existing: { id: string; species: Species; name: string; inMemory?: boolean }[];
};

export type PhotoIndex = { byName: Map<string, string>; byStem: Map<string, string[]> };

export function buildPhotoIndex(photos: { id: string; name: string }[]): PhotoIndex {
  const byName = new Map<string, string>();
  const byStem = new Map<string, string[]>();
  for (const p of photos) {
    byName.set(fileNameKey(p.name), p.id);
    const stem = fileNameKey(splitFileName(p.name).base);
    byStem.set(stem, [...(byStem.get(stem) ?? []), p.id]);
  }
  return { byName, byStem };
}

/** A photo by its library name, with or without the file type; a name shared by two photos is ambiguous. */
export function findPhoto(index: PhotoIndex, token: string): { id: string } | { problem: "missing" | "ambiguous" } {
  const key = fileNameKey(token);
  const exact = index.byName.get(key);
  if (exact) return { id: exact };
  const stems = index.byStem.get(fileNameKey(splitFileName(token).base)) ?? [];
  if (stems.length === 1) return { id: stems[0] };
  return { problem: stems.length > 1 ? "ambiguous" : "missing" };
}

// ─── The plan ────────────────────────────────────────────────────────────────
export type PlannedAnimal = {
  line: number;
  action: "create" | "update";
  existingId: string | null;
  name: string;
  species: Species;
  /** Only what the sheet filled in. Anything absent is left as it is (or defaulted, for a new animal). */
  fields: {
    category_id?: string;
    sex?: string;
    breed?: string;
    color?: string;
    height?: string;
    tagline?: string;
    highlights?: string[];
    video_url?: string;
    registered_name?: string;
    registry?: string;
    registration_number?: string;
    birth?: { date: string; precision: "year" | "month" | "day" };
    description?: string;
    status?: "active" | "retired" | "reference" | "deceased";
    published?: boolean;
    featured?: boolean;
    sale?: { status: "none" | "available" | "pending" | "sold"; priceCents: number | null };
    facts?: { label: string; value: string }[];
    photoIds?: string[];
    /** Sire, dam and grandparents by name, as the sheet gave them. */
    pedigree?: { path: string; name: string }[];
  };
  warnings: string[];
};

export type RowResult = { line: number; name: string; errors: string[]; planned: PlannedAnimal | null };

export type ImportPlan = {
  /** Template example rows that were left out. */
  skippedExamples: number;
  fileErrors: string[];
  unknownColumns: string[];
  results: RowResult[];
  missingPhotos: string[];
  breeds: { species: Species; name: string }[];
};

const lower = (s: string) => s.trim().toLowerCase();

function findCategory(ctx: ImportContext, raw: string, species: Species | null) {
  const key = lower(raw);
  const matches = ctx.categories.filter(
    (c) => (!species || c.species === species) && [c.id, c.key, c.label, c.labelPlural].some((n) => lower(n) === key),
  );
  return matches;
}

export function planImport(csv: Csv, ctx: ImportContext): ImportPlan {
  const plan: ImportPlan = {
    skippedExamples: 0,
    fileErrors: [],
    unknownColumns: [],
    results: [],
    missingPhotos: [],
    breeds: [],
  };
  if (csv.header.length === 0) {
    plan.fileErrors.push("The file is empty. Download the template for the columns to fill in.");
    return plan;
  }
  const { columns, unknown } = mapHeader(csv.header);
  plan.unknownColumns = unknown;
  if (!columns.includes("name")) {
    plan.fileErrors.push("The file needs a “name” column.");
    return plan;
  }
  if (csv.rows.length === 0) {
    plan.fileErrors.push("The file has a header row but no animals.");
    return plan;
  }
  if (csv.rows.length > MAX_ROWS) {
    plan.fileErrors.push(`The file has ${csv.rows.length} animals. Import up to ${MAX_ROWS} at a time.`);
    return plan;
  }

  const photoIndex = buildPhotoIndex(ctx.photos);
  const seenInFile = new Set<string>();
  const missing = new Set<string>();
  const breeds = new Map<string, { species: Species; name: string }>();

  csv.rows.forEach((cells, i) => {
    const line = i + 2; // the header is row 1 in a spreadsheet
    const cell = (c: ImportColumn) => {
      const at = columns.indexOf(c);
      return at >= 0 ? (cells[at] ?? "").trim() : "";
    };
    const errors: string[] = [];
    const warnings: string[] = [];
    const fail = (column: string, message: string) => errors.push(`${column}: ${message}`);

    const name = cell("name");
    if (isExampleName(name)) {
      plan.skippedExamples++;
      return;
    }
    if (!name) fail("name", "enter a name.");
    else if (name.length > 120) fail("name", "use 120 characters or fewer.");

    // ── Which animal is this? ────────────────────────────────────────────────
    const idCell = cell("id");
    let existing = idCell ? ctx.existing.find((e) => e.id === idCell) : undefined;
    if (idCell && !existing) fail("id", "no animal has this id. Leave it blank to add a new animal.");

    // ── Species and category ────────────────────────────────────────────────
    let species: Species | null = null;
    const speciesCell = cell("species");
    if (speciesCell) {
      const s = lower(speciesCell);
      species = s === "horse" || s === "horses" ? "horse" : s === "cattle" ? "cattle" : null;
      if (!species) fail("species", `“${speciesCell}” isn't horse or cattle.`);
      else if (!ctx.enabledSpecies.includes(species)) fail("species", `${species} isn't turned on for this ranch.`);
    }
    if (existing && !species) species = existing.species;

    let categoryId: string | undefined;
    const categoryCell = cell("category");
    if (categoryCell) {
      const matches = findCategory(ctx, categoryCell, species);
      if (matches.length === 0) {
        const choices = ctx.categories.filter((c) => !species || c.species === species).map((c) => c.label);
        fail("category", `“${categoryCell}” isn't one of your categories (${[...new Set(choices)].join(", ")}).`);
      } else if (matches.length > 1) {
        fail("category", `“${categoryCell}” could be a horse or a cattle category. Add the species column.`);
      } else {
        categoryId = matches[0].id;
        species ??= matches[0].species;
      }
    }
    if (!species && ctx.enabledSpecies.length === 1) species = ctx.enabledSpecies[0];
    if (!species && !errors.some((e) => e.startsWith("species:") || e.startsWith("id:"))) {
      fail("species", "say whether this is a horse or cattle.");
    }

    // ── Is it new or already here? ──────────────────────────────────────────
    if (!existing && species && name) {
      const same = ctx.existing.filter((e) => e.species === species && lower(e.name) === lower(name));
      if (same.length === 1) existing = same[0];
      else if (same.length > 1)
        fail("name", `${same.length} animals are called “${name}”. Add the id column to choose one.`);
    }
    if (existing && species && existing.species !== species)
      fail("species", "this id belongs to an animal of a different species.");
    if (species && name) {
      const key = `${species}:${lower(name)}:${existing?.id ?? ""}`;
      if (seenInFile.has(key)) fail("name", `“${name}” appears more than once in the file.`);
      seenInFile.add(key);
    }
    const action = existing ? "update" : "create";
    if (action === "create" && species && !categoryId && !errors.some((e) => e.startsWith("category:"))) {
      fail("category", "choose a category for a new animal.");
    }

    // ── Sex ─────────────────────────────────────────────────────────────────
    const fields: PlannedAnimal["fields"] = {};
    if (categoryId) fields.category_id = categoryId;
    const category = categoryId ? ctx.categories.find((c) => c.id === categoryId) : undefined;
    const sexCell = cell("sex");
    if (sexCell) {
      const sex = parseSex(sexCell);
      if (!sex) fail("sex", `“${sexCell}” isn't male, female, gelding or steer.`);
      else fields.sex = sex;
    } else if (action === "create" && category) {
      // A "Bull" is male: no need to say so.
      fields.sex = category.allowedSexes.length === 1 ? category.allowedSexes[0] : "unknown";
    }
    if (category && fields.sex && !category.allowedSexes.includes(fields.sex)) {
      fail("sex", `a ${category.label.toLowerCase()} can't be ${fields.sex}.`);
    }

    // ── Plain text fields ───────────────────────────────────────────────────
    for (const [column, limit, key] of [
      ["breed", 80, "breed"],
      ["color", 80, "color"],
      ["height", 12, "height"],
      ["tagline", TAGLINE_MAX, "tagline"],
      ["registered_name", 160, "registered_name"],
      ["registry", 80, "registry"],
      ["registration_number", 60, "registration_number"],
    ] as const) {
      const v = cell(column);
      if (!v) continue;
      if (v.length > limit) fail(column, `use ${limit} characters or fewer.`);
      else fields[key] = v;
    }
    if (fields.breed && species && !breeds.has(`${species}:${lower(fields.breed)}`)) {
      // The first spelling seen wins; the database matches the rest to it.
      breeds.set(`${species}:${lower(fields.breed)}`, { species, name: fields.breed });
    }
    const highlightsCell = cell("highlights");
    if (highlightsCell) {
      const list = splitList(highlightsCell);
      if (list.length > HIGHLIGHTS) fail("highlights", `use up to ${HIGHLIGHTS} highlights, separated by ;.`);
      else if (list.some((h) => h.length > HIGHLIGHT_MAX))
        fail("highlights", `keep each highlight to ${HIGHLIGHT_MAX} characters.`);
      else fields.highlights = list;
    }
    const videoCell = cell("video_url");
    if (videoCell) {
      const video = parseVideoUrl(videoCell);
      if (!video.ok) fail("video_url", video.message);
      else fields.video_url = video.url;
    }
    const description = cell("description");
    if (description) fields.description = description;

    // ── Birth date ──────────────────────────────────────────────────────────
    const birthCell = cell("birth_date");
    if (birthCell) {
      const birth = parseBirth(birthCell);
      if (!birth) fail("birth_date", `“${birthCell}” isn't a date. Use 2019, 2019-05 or 2019-05-03.`);
      else fields.birth = birth;
    }

    // ── Website status ──────────────────────────────────────────────────────
    const statusCell = cell("status");
    if (statusCell) {
      const status = parseStatus(statusCell);
      if (!status) fail("status", `“${statusCell}” isn't active, retired, reference or in memory.`);
      else fields.status = status;
    }
    for (const [column, key] of [
      ["published", "published"],
      ["featured", "featured"],
    ] as const) {
      const v = cell(column);
      if (!v) continue;
      const parsed = parseYesNo(v);
      if (parsed === null) fail(column, `“${v}” isn't yes or no.`);
      else fields[key] = parsed;
    }

    // ── For sale ────────────────────────────────────────────────────────────
    const saleCell = cell("for_sale");
    const priceCell = cell("price");
    if (saleCell || priceCell) {
      const status = saleCell ? parseSale(saleCell) : null;
      const cents = priceCell ? parsePrice(priceCell) : null;
      if (saleCell && !status) fail("for_sale", `“${saleCell}” isn't none, available, pending or sold.`);
      if (priceCell && cents === null) fail("price", `“${priceCell}” isn't a price. Use a number like 8500.`);
      if (priceCell && !saleCell) fail("price", "add for_sale = available to list a price.");
      if (status && (status !== "none" || !priceCell)) {
        if (status === "none" && priceCell) fail("price", "an animal that isn't for sale can't have a price.");
        else fields.sale = { status, priceCents: status === "sold" ? null : cents };
      }
    }

    // ── Quick Facts ─────────────────────────────────────────────────────────
    const factsCell = cell("quick_facts");
    if (factsCell) {
      const parsed = parseFacts(factsCell);
      if ("error" in parsed) fail("quick_facts", parsed.error);
      else if (parsed.facts.length) fields.facts = parsed.facts;
    }

    // ── Pedigree: names only; who is who is settled when the pedigree is filled in ──
    const places: { path: string; name: string }[] = [];
    for (const { column, path } of pedigreePlaces) {
      const v = cell(column);
      if (!v) continue;
      if (v.length > 120) fail(column, "use 120 characters or fewer.");
      else places.push({ path, name: v });
    }
    if (places.length) fields.pedigree = places;

    // ── Photos ──────────────────────────────────────────────────────────────
    const photosCell = cell("photos");
    if (photosCell) {
      const ids: string[] = [];
      for (const token of splitList(photosCell)) {
        const hit = findPhoto(photoIndex, token);
        if ("id" in hit) {
          if (!ids.includes(hit.id)) ids.push(hit.id);
        } else if (hit.problem === "ambiguous") {
          warnings.push(`photos: “${token}” matches more than one photo. Use the full name, like ${token}.jpg.`);
        } else {
          missing.add(token);
          warnings.push(`photos: “${token}” isn't in your Photo Library, so it was skipped.`);
        }
      }
      if (ids.length) fields.photoIds = ids;
    }

    // An animal In memory stays in memory: a sheet can't quietly move it back to Active or hide it.
    if (existing?.inMemory) {
      if (fields.status && fields.status !== "deceased") {
        delete fields.status;
        warnings.push(
          `${name} is In memory, so the status was left as it is. To change it, use the animal's own page.`,
        );
      }
      if (fields.published === false) {
        delete fields.published;
        warnings.push(`${name} is In memory, so it was kept on the website. To hide it, use the animal's own page.`);
      }
    }

    plan.results.push({
      line,
      name: name || "(no name)",
      errors,
      planned:
        errors.length === 0 && species
          ? { line, action, existingId: existing?.id ?? null, name, species, fields, warnings }
          : null,
    });
  });

  plan.missingPhotos = [...missing];
  plan.breeds = [...breeds.values()];
  return plan;
}
