/**
 * Reading a pedigree spreadsheet: one row per ancestor, saying whose pedigree it
 * is, where the ancestor sits (S = sire, D = dam, SD = the sire's dam, SSD = the
 * sire's sire's dam, up to six levels) and who they are. This file holds the
 * rules and no database access: it is handed what the ranch already has and
 * returns what should be created, linked and filled in.
 *
 * Who is who, in order:
 *  1. A name that is one of the ranch's own animals links to that animal.
 *  2. Otherwise an ancestor already recorded for pedigrees is reused.
 *  3. Otherwise a new ancestor is made, once, however many times it appears
 *     (linebreeding), within one pedigree or across several.
 * A registration number settles it when there is one; the same name with a
 * different number, or a different birth year, is a different animal.
 */
import type { Csv } from "./csv";
import { isExampleName, normaliseHeader } from "./animals";

export const MAX_PEDIGREE_ROWS = 500;
export const MAX_LEVELS = 6;

export const pedigreeColumns = [
  "animal",
  "animal_id",
  "species",
  "position",
  "name",
  "registry",
  "registration_number",
  "birth_year",
  "color",
  "height",
  "breed",
] as const;
export type PedigreeColumn = (typeof pedigreeColumns)[number];

const aliases: Record<string, PedigreeColumn> = {
  horse: "animal",
  subject: "animal",
  animal_name: "animal",
  pedigree_of: "animal",
  pedigree_for: "animal",
  type: "species",
  pos: "position",
  place: "position",
  ancestor: "name",
  ancestor_name: "name",
  reg_number: "registration_number",
  registration: "registration_number",
  registration_no: "registration_number",
  reg: "registration_number",
  year: "birth_year",
  born: "birth_year",
  foaled: "birth_year",
  calved: "birth_year",
  yob: "birth_year",
  colour: "color",
  hands: "height",
};

export const templateRows: Record<PedigreeColumn, string>[] = [
  ["Example Horse", "S", "Example Sire", "AQHA", "1234567", "2005", "Sorrel", "15.2hh", "Quarter Horse"],
  ["", "D", "Example Dam", "AQHA", "2345678", "2008", "Bay", "15.0hh", "Quarter Horse"],
  ["", "SS", "Example Grandsire", "AQHA", "345678", "1998", "Dun", "15.1hh", "Quarter Horse"],
  ["", "SD", "Example Granddam", "", "", "2001", "Bay", "", ""],
  ["", "DS", "Example Grandsire", "AQHA", "345678", "1998", "Dun", "15.1hh", "Quarter Horse"],
].map(([animal, position, name, registry, registration_number, birth_year, color, height, breed]) => ({
  animal,
  animal_id: "",
  species: "",
  position,
  name,
  registry,
  registration_number,
  birth_year,
  color,
  height,
  breed,
}));

export function mapPedigreeHeader(header: string[]): { columns: (PedigreeColumn | null)[]; unknown: string[] } {
  const unknown: string[] = [];
  const seen = new Set<PedigreeColumn>();
  const columns = header.map((raw) => {
    const key = normaliseHeader(raw);
    const column = (pedigreeColumns as readonly string[]).includes(key) ? (key as PedigreeColumn) : aliases[key];
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

// ─── Positions ───────────────────────────────────────────────────────────────
/** "SD", "sire's dam", "Sire Dam" and "s-d" all mean the same place. Null when it isn't a place. */
export function parsePosition(raw: string): string | null {
  const words = raw
    .trim()
    .toLowerCase()
    .replace(/['’]s\b/g, " ")
    .split(/[^a-z]+/)
    .filter((w) => w && w !== "of" && w !== "the");
  let letters = "";
  for (const w of words) {
    if (w === "sire") letters += "S";
    else if (w === "dam") letters += "D";
    else if (/^[sd]+$/.test(w)) letters += w.toUpperCase();
    else return null;
  }
  return letters.length >= 1 && letters.length <= MAX_LEVELS ? letters : null;
}

/** "SSD" → "Sire's sire's dam". */
export function positionLabel(path: string): string {
  const words = [...path].map((l) => (l === "S" ? "sire" : "dam"));
  const text = words.join("'s ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ─── Names and registrations ─────────────────────────────────────────────────
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const regNumber = (n: string | null | undefined) => (n ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const regName = (r: string | null | undefined) => (r ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

type Identity = {
  name: string;
  /** The registered name, when the animal has one: a pedigree may use either name. */
  registeredName?: string | null;
  registry: string | null;
  registrationNumber: string | null;
  birthYear: number | null;
};

/** Both have a registration number and it is the same one. */
function sameRegistration(a: Identity, b: Identity): boolean {
  const na = regNumber(a.registrationNumber);
  const nb = regNumber(b.registrationNumber);
  if (!na || !nb || na !== nb) return false;
  const ra = regName(a.registry);
  const rb = regName(b.registry);
  return !ra || !rb || ra === rb;
}

/** Same name, and nothing that says they are different animals. */
function compatible(a: Identity, b: Identity): boolean {
  // "Rosie" on a pedigree is the animal the ranch calls "Hereford Cow #408" if that is her registered name.
  const mine = normaliseName(a.name);
  const theirs = [b.name, b.registeredName].filter((n): n is string => Boolean(n)).map(normaliseName);
  if (!theirs.includes(mine)) return false;
  const na = regNumber(a.registrationNumber);
  const nb = regNumber(b.registrationNumber);
  if (na && nb && !sameRegistration(a, b)) return false;
  if (a.birthYear && b.birthYear && a.birthYear !== b.birthYear) return false;
  return true;
}

// ─── What the planner is given and returns ───────────────────────────────────
export type KnownAnimal = {
  id: string;
  name: string;
  species: "horse" | "cattle";
  sex: string;
  registeredName?: string | null;
  /** "inventory" is one of the ranch's own animals; "pedigree_only" was recorded just for a pedigree. */
  scope: "inventory" | "pedigree_only";
  registry: string | null;
  registrationNumber: string | null;
  birthYear: number | null;
  color: string | null;
  height: string | null;
  breed: string | null;
  sireId: string | null;
  damId: string | null;
};

export type Ref = { id: string } | { key: string };
export const refKey = (r: Ref) => ("id" in r ? `id:${r.id}` : `new:${r.key}`);

export type NewAncestor = {
  key: string;
  species: "horse" | "cattle";
  sex: "male" | "female";
  name: string;
  registry: string | null;
  registrationNumber: string | null;
  birthYear: number | null;
  color: string | null;
  height: string | null;
  breed: string | null;
};

/** Fields to add to an ancestor that is already recorded; only blanks are ever filled. */
export type FillFields = {
  registry: string;
  registration_number: string;
  birth_year: number;
  color: string;
  height: string;
  breed: string;
};
export type FillField = keyof FillFields;
export type Fill = { id: string; fields: Partial<FillFields> };

/** "Make `parent` the `role` of `child`." */
export type Link = { child: Ref; role: "sire" | "dam"; parent: Ref };

export type RowOutcome = "new" | "yours" | "recorded" | "already";
export type PedigreeRowResult = {
  line: number;
  subject: string;
  position: string;
  label: string;
  name: string;
  outcome: RowOutcome | null;
  /** What gets filled in on an ancestor that is already recorded, in words. */
  fills: string[];
  errors: string[];
  warnings: string[];
};

export type PedigreePlan = {
  fileErrors: string[];
  unknownColumns: string[];
  skippedExamples: number;
  skippedUnknown: number;
  rows: PedigreeRowResult[];
  newAncestors: NewAncestor[];
  fills: Fill[];
  links: Link[];
  subjects: string[];
};

type Cell = Partial<Record<PedigreeColumn, string>>;

const lower = (s: string) => s.trim().toLowerCase();
const UNKNOWN_NAMES = new Set(["unknown", "unk", "n/a", "na", "none", "?", "-", "—"]);

const toYear = (raw: string): number | null | "bad" => {
  const t = raw.trim();
  if (!t) return null;
  const m = /^(\d{4})(?:[-/]\d{1,2}(?:[-/]\d{1,2})?)?$/.exec(t);
  const y = m ? Number(m[1]) : NaN;
  return y >= 1800 && y <= new Date().getFullYear() ? y : "bad";
};

export function planPedigreeImport(csv: Csv, known: KnownAnimal[]): PedigreePlan {
  const plan: PedigreePlan = {
    fileErrors: [],
    unknownColumns: [],
    skippedExamples: 0,
    skippedUnknown: 0,
    rows: [],
    newAncestors: [],
    fills: [],
    links: [],
    subjects: [],
  };
  const { columns, unknown } = mapPedigreeHeader(csv.header);
  plan.unknownColumns = unknown;
  const has = (c: PedigreeColumn) => columns.includes(c);
  if (!has("position")) plan.fileErrors.push("The file needs a position column (S, D, SS, SD…).");
  if (!has("name")) plan.fileErrors.push("The file needs a name column for each ancestor.");
  if (!has("animal") && !has("animal_id"))
    plan.fileErrors.push("The file needs an animal column: whose pedigree each row belongs to.");
  if (csv.rows.length === 0 && plan.fileErrors.length === 0) plan.fileErrors.push("The file has a header but no rows.");
  if (csv.rows.length > MAX_PEDIGREE_ROWS)
    plan.fileErrors.push(`That file has ${csv.rows.length} rows. Split it into files of up to ${MAX_PEDIGREE_ROWS}.`);
  if (plan.fileErrors.length) return plan;

  const byId = new Map(known.map((a) => [a.id, a]));
  const owned = known.filter((a) => a.scope === "inventory");

  type Parsed = {
    result: PedigreeRowResult;
    subject: KnownAnimal | null;
    path: string;
    data: Identity & { color: string | null; height: string | null; breed: string | null };
    role: "sire" | "dam";
  };
  const parsed: Parsed[] = [];

  // ── Read each row ──
  let carried: Cell = {};
  csv.rows.forEach((cells, i) => {
    const row: Cell = {};
    columns.forEach((c, idx) => {
      if (c) row[c] = (cells[idx] ?? "").trim();
    });
    const line = i + 2;
    if (!row.animal && !row.animal_id && carried.animal !== undefined) {
      row.animal = carried.animal;
      row.animal_id = carried.animal_id;
      row.species = row.species || carried.species;
    } else carried = { animal: row.animal, animal_id: row.animal_id, species: row.species };

    if (isExampleName(row.animal ?? "") || isExampleName(row.name ?? "")) {
      plan.skippedExamples++;
      return;
    }
    const nameText = row.name ?? "";
    if (!nameText || UNKNOWN_NAMES.has(lower(nameText))) {
      // "Unknown" is how a chart says nobody is recorded: the place is simply left empty.
      if (row.position) plan.skippedUnknown++;
      return;
    }

    const result: PedigreeRowResult = {
      line,
      subject: row.animal || row.animal_id || "",
      position: row.position ?? "",
      label: "",
      name: nameText,
      outcome: null,
      fills: [],
      errors: [],
      warnings: [],
    };

    // Whose pedigree.
    let subject: KnownAnimal | null = null;
    if (row.animal_id) {
      subject = owned.find((a) => a.id === row.animal_id) ?? null;
      if (!subject) result.errors.push("That animal id isn't one of your animals.");
    } else if (row.animal) {
      const species = lower(row.species ?? "");
      const matches = owned.filter(
        (a) =>
          [a.name, a.registeredName ?? ""].map(normaliseName).includes(normaliseName(row.animal!)) &&
          (!species || a.species === species || `${a.species}s` === species),
      );
      if (matches.length === 0) result.errors.push(`“${row.animal}” isn't one of your animals. Check the spelling.`);
      else if (matches.length > 1)
        result.errors.push(
          `You have more than one animal named “${row.animal}”. Add the species column, or use animal_id.`,
        );
      else subject = matches[0];
      if (matches.length === 1) result.subject = matches[0].name;
    } else result.errors.push("Which animal's pedigree is this? Fill in the animal column.");

    // Where.
    const path = parsePosition(row.position ?? "");
    if (!path) {
      result.errors.push(
        row.position
          ? `“${row.position}” isn't a place in a pedigree. Use S, D, SS, SD, DS, DD… (up to ${MAX_LEVELS} letters).`
          : "Fill in the position (S, D, SS, SD…).",
      );
    } else {
      result.label = positionLabel(path);
      result.position = path;
    }

    // Who.
    if (nameText.length > 120) result.errors.push("Use 120 characters or fewer for the name.");
    const year = toYear(row.birth_year ?? "");
    if (year === "bad") result.warnings.push(`“${row.birth_year}” isn't a usable birth year, so it was left out.`);
    const height = row.height?.trim() || null;
    if (height && height.length > 12)
      result.warnings.push("The height is too long (12 characters at most), so it was left out.");

    parsed.push({
      result,
      subject,
      path: path ?? "",
      role: path?.endsWith("D") ? "dam" : "sire",
      data: {
        name: nameText.replace(/\s+/g, " "),
        registry: row.registry || null,
        registrationNumber: row.registration_number || null,
        birthYear: typeof year === "number" ? year : null,
        color: row.color || null,
        height: height && height.length <= 12 ? height : null,
        breed: row.breed || null,
      },
    });
    plan.rows.push(result);
  });

  // ── Who each ancestor is, shared across the whole file ──
  const clusters: (NewAncestor & { id?: undefined })[] = [];
  const fillById = new Map<string, Fill>();
  const subjectsSeen = new Set<string>();

  type Pick = { ref: Ref; kind: "yours" | "recorded" | "new"; animal: KnownAnimal | null } | { error: string };
  function identify(p: Parsed): Pick {
    const subject = p.subject!;
    const me: Identity = p.data;
    const sexOk = (a: { sex: string }) => (p.role === "dam" ? a.sex === "female" : a.sex !== "female");
    const candidates = known.filter((a) => a.species === subject.species && compatible(me, a));
    if (candidates.length > 0) {
      const strong = candidates.filter((a) => sameRegistration(me, a));
      const pool = strong.length > 0 ? strong : candidates;
      // A name alone can mean either of two recorded animals; asking is better than guessing.
      if (pool.length > 1)
        return {
          error: `More than one animal named “${p.data.name}” is already recorded. Add the registration number to say which.`,
        };
      const chosen = pool[0];
      if (!sexOk(chosen))
        return {
          error: `${chosen.name} is recorded as ${chosen.sex === "female" ? "female" : "male"}, so can't be a ${p.role}.`,
        };
      return { ref: { id: chosen.id }, kind: chosen.scope === "inventory" ? "yours" : "recorded", animal: chosen };
    }
    const sex = p.role === "dam" ? "female" : "male";
    const hit = clusters.find((c) => c.species === subject.species && c.sex === sex && compatible(me, c));
    if (hit) {
      // Fill what the first mention left blank; a later row can add the registration number.
      hit.registry ??= p.data.registry;
      hit.registrationNumber ??= p.data.registrationNumber;
      hit.birthYear ??= p.data.birthYear;
      hit.color ??= p.data.color;
      hit.height ??= p.data.height;
      hit.breed ??= p.data.breed;
      return { ref: { key: hit.key }, kind: "new", animal: null };
    }
    const made: NewAncestor = {
      key: String(clusters.length + 1),
      species: subject.species,
      sex,
      name: p.data.name,
      registry: p.data.registry,
      registrationNumber: p.data.registrationNumber,
      birthYear: p.data.birthYear,
      color: p.data.color,
      height: p.data.height,
      breed: p.data.breed,
    };
    clusters.push(made);
    return { ref: { key: made.key }, kind: "new", animal: null };
  }

  // ── Place each pedigree, nearest ancestors first ──
  const bySubject = new Map<string, Parsed[]>();
  for (const p of parsed) {
    if (!p.subject || !p.path || p.result.errors.length) continue;
    bySubject.set(p.subject.id, [...(bySubject.get(p.subject.id) ?? []), p]);
  }

  const linkParent = new Map<string, Ref>(); // "childRef|role" → parent, to spot contradictions between pedigrees
  const linkLine = new Map<string, number>();

  for (const [subjectId, list] of bySubject) {
    const subject = byId.get(subjectId)!;
    subjectsSeen.add(subject.name);
    list.sort((a, b) => a.path.length - b.path.length || a.result.line - b.result.line);

    // What the animal's pedigree already holds, so deeper rows can attach to it.
    const effective = new Map<string, Ref>();
    const existingAt = new Set<string>();
    const walk = (animal: KnownAnimal, path: string) => {
      if (path.length >= MAX_LEVELS) return;
      for (const [letter, parentId] of [
        ["S", animal.sireId],
        ["D", animal.damId],
      ] as const) {
        const parent = parentId ? byId.get(parentId) : null;
        if (!parent) continue;
        effective.set(path + letter, { id: parent.id });
        existingAt.add(path + letter);
        walk(parent, path + letter);
      }
    };
    walk(subject, "");
    const refAnimal = (r: Ref) => ("id" in r ? (byId.get(r.id) ?? null) : null);
    const used = new Set<string>();

    for (const p of list) {
      const r = p.result;
      if (used.has(p.path)) {
        r.errors.push(`${r.label} appears more than once for ${subject.name}.`);
        continue;
      }
      used.add(p.path);
      const parentPath = p.path.slice(0, -1);
      const child: Ref | undefined = parentPath ? effective.get(parentPath) : { id: subject.id };
      if (!child) {
        r.errors.push(
          `${positionLabel(parentPath)} isn't recorded yet. Add a row for it first (or fill it in on the animal).`,
        );
        continue;
      }
      const pick = identify(p);
      if ("error" in pick) {
        r.errors.push(pick.error);
        continue;
      }
      if ("id" in pick.ref && pick.ref.id === subject.id) {
        r.errors.push(`${subject.name} can't be in their own pedigree.`);
        continue;
      }

      // A place that is already filled stays as it is.
      const current = effective.get(p.path);
      if (current && existingAt.has(p.path)) {
        const same = refKey(current) === refKey(pick.ref);
        r.outcome = "already";
        if (!same) {
          const other = refAnimal(current);
          r.warnings.push(
            `${other?.name ?? "Someone"} is already recorded as ${r.label.toLowerCase()}, so this row was not used.`,
          );
        }
        continue;
      }

      // The same child can't get two different parents from two pedigrees.
      const slot = `${refKey(child)}|${p.role}`;
      const earlier = linkParent.get(slot);
      if (earlier && refKey(earlier) !== refKey(pick.ref)) {
        r.errors.push(`This contradicts row ${linkLine.get(slot)}, which gives the same animal a different ${p.role}.`);
        continue;
      }
      if (!earlier) {
        linkParent.set(slot, pick.ref);
        linkLine.set(slot, r.line);
        plan.links.push({ child, role: p.role, parent: pick.ref });
      }
      effective.set(p.path, pick.ref);

      r.outcome = pick.kind;
      if (pick.animal && pick.kind === "recorded") {
        const a = pick.animal;
        const fields: Fill["fields"] = {};
        const add = <K extends FillField>(field: K, have: unknown, value: FillFields[K] | null) => {
          if (!have && value !== null) fields[field] = value;
        };
        add("registry", a.registry, p.data.registry);
        add("registration_number", a.registrationNumber, p.data.registrationNumber);
        add("birth_year", a.birthYear, p.data.birthYear);
        add("color", a.color, p.data.color);
        add("height", a.height, p.data.height);
        add("breed", a.breed, p.data.breed);
        const names = Object.keys(fields).map((f) => f.replace(/_/g, " "));
        if (names.length) {
          const prior = fillById.get(a.id);
          if (prior) Object.assign(prior.fields, fields);
          else fillById.set(a.id, { id: a.id, fields });
          r.fills = names;
        }
      }
    }
  }

  // Only ancestors that ended up in the pedigree are made; one whose row was rejected is not.
  const referenced = new Set<string>();
  for (const l of plan.links) for (const r of [l.child, l.parent]) if ("key" in r) referenced.add(r.key);
  plan.newAncestors = clusters.filter((c) => referenced.has(c.key));
  plan.fills = [...fillById.values()];
  plan.subjects = [...subjectsSeen];
  return plan;
}
