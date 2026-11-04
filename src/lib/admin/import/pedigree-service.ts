/**
 * Pedigree spreadsheet import: the database work around the rules in ./pedigree.ts.
 * Plain functions over the owner's Supabase client, so RLS applies. New ancestors
 * are recorded for pedigrees only (they never appear on the website as animals);
 * ancestors that are already recorded only have blanks filled; the ranch's own
 * animals are linked but never changed apart from gaining a sire or dam.
 */
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";
import { ancestorColumns } from "@/lib/admin/pedigree/fields";
import { parseCsv } from "./csv";
import {
  planPedigreeImport,
  type Fill,
  type KnownAnimal,
  type NewAncestor,
  type PedigreePlan,
  type PedigreeRowResult,
  type Ref,
} from "./pedigree";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

type Row = {
  id: string;
  name: string;
  species: "horse" | "cattle";
  sex: string;
  record_scope: string;
  registry: string | null;
  registration_number: string | null;
  birth_year: number | null;
  color: string | null;
  breed: string | null;
  height?: string | null;
  sire_id: string | null;
  dam_id: string | null;
};

/** Everything the ranch has recorded: its own animals and the ancestors kept for pedigrees. */
async function loadKnown(db: Db, ranchId: string): Promise<Result<KnownAnimal[]>> {
  const base =
    "id, name, species, sex, record_scope, registry, registration_number, birth_year, color, breed, sire_id, dam_id";
  const query = (columns: string) =>
    db.from("animals").select(columns).eq("ranch_id", ranchId).is("archived_at", null).limit(5000);
  let { data, error } = await query(`${base}, height`);
  // Before the height migration is applied the column doesn't exist; read the rest.
  if (error && /height/.test(error.message)) ({ data, error } = await query(base));
  if (error) return fail(dbErrorMessage(error));
  return ok(
    ((data ?? []) as unknown as Row[]).map((a) => ({
      id: a.id,
      name: a.name,
      species: a.species,
      sex: a.sex,
      scope: a.record_scope === "inventory" ? ("inventory" as const) : ("pedigree_only" as const),
      registry: a.registry,
      registrationNumber: a.registration_number,
      birthYear: a.birth_year,
      color: a.color,
      height: a.height ?? null,
      breed: a.breed,
      sireId: a.sire_id,
      damId: a.dam_id,
    })),
  );
}

async function planFrom(db: Db, ranchId: string, csvText: string): Promise<Result<PedigreePlan>> {
  const known = await loadKnown(db, ranchId);
  if (!known.ok) return known;
  return ok(planPedigreeImport(parseCsv(csvText), known.data));
}

// ─── Preview ─────────────────────────────────────────────────────────────────
export type PedigreeImportPreview = {
  fileErrors: string[];
  unknownColumns: string[];
  skippedExamples: number;
  skippedUnknown: number;
  rows: PedigreeRowResult[];
  /** The ranch's animals whose pedigrees the file adds to. */
  subjects: string[];
  newAncestors: number;
  yours: number;
  recorded: number;
  already: number;
  withProblems: number;
};

export async function previewPedigreeImport(
  db: Db,
  ranchId: string,
  csvText: string,
): Promise<Result<PedigreeImportPreview>> {
  const planned = await planFrom(db, ranchId, csvText);
  if (!planned.ok) return planned;
  const plan = planned.data;
  const count = (outcome: PedigreeRowResult["outcome"]) => plan.rows.filter((r) => r.outcome === outcome).length;
  return ok({
    fileErrors: plan.fileErrors,
    unknownColumns: plan.unknownColumns,
    skippedExamples: plan.skippedExamples,
    skippedUnknown: plan.skippedUnknown,
    rows: plan.rows,
    subjects: plan.subjects,
    newAncestors: plan.newAncestors.length,
    yours: count("yours"),
    recorded: count("recorded"),
    already: count("already"),
    withProblems: plan.rows.filter((r) => r.errors.length > 0).length,
  });
}

// ─── Saving ──────────────────────────────────────────────────────────────────
export type PedigreeImportResult = {
  created: number;
  linked: number;
  filled: number;
  /** Things that could not be saved, in plain words. */
  problems: string[];
};

async function inBatches<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(run))));
  return out;
}
const noHeightColumn = (error: { message?: string } | null) => Boolean(error?.message?.includes("height"));

async function createAncestor(db: Db, ranchId: string, a: NewAncestor): Promise<Result<string>> {
  const fields = ancestorColumns({
    name: a.name,
    registry: a.registry,
    registrationNumber: a.registrationNumber,
    birthYear: a.birthYear,
    color: a.color,
    height: a.height,
    breed: a.breed,
  });
  if (!fields.ok) return fail(fields.message);
  const insert = (withHeight: boolean) => {
    const { height, ...rest } = fields.columns;
    return db
      .from("animals")
      .insert({
        ...rest,
        ...(withHeight && height ? { height } : {}),
        description: null,
        ranch_id: ranchId,
        species: a.species,
        record_scope: "pedigree_only",
        slug: "",
        sex: a.sex,
      })
      .select("id")
      .single();
  };
  let { data, error } = await insert(true);
  if (error && noHeightColumn(error)) ({ data, error } = await insert(false));
  if (error || !data) return fail(dbErrorMessage(error!));
  return ok(data.id);
}

async function fillAncestor(db: Db, ranchId: string, f: Fill): Promise<Result> {
  const { birth_year, ...rest } = f.fields;
  const update = (withHeight: boolean) => {
    const { height, ...others } = rest;
    return db
      .from("animals")
      .update({
        ...others,
        ...(withHeight && height ? { height } : {}),
        ...(birth_year ? { birth_date: `${birth_year}-01-01`, birth_precision: "year" as const } : {}),
      })
      .eq("id", f.id)
      .eq("ranch_id", ranchId)
      .eq("record_scope", "pedigree_only")
      .select("id");
  };
  let { error } = await update(true);
  if (error && noHeightColumn(error)) ({ error } = await update(false));
  return error ? fail(dbErrorMessage(error)) : ok(null);
}

export async function commitPedigreeImport(
  db: Db,
  ranchId: string,
  csvText: string,
): Promise<Result<PedigreeImportResult>> {
  const planned = await planFrom(db, ranchId, csvText);
  if (!planned.ok) return planned;
  if (planned.data.fileErrors.length) return fail(planned.data.fileErrors[0]);
  return applyPedigreePlan(db, ranchId, planned.data);
}

// ─── Pedigrees given as columns on the animals sheet (sire, dam, grandparents) ──
/** One animal from the animals sheet and the places it names. `line` is its row in that sheet. */
export type SheetPedigree = {
  line: number;
  name: string;
  species: "horse" | "cattle";
  sex: string;
  places: { path: string; name: string }[];
  /** True when the animal doesn't exist yet (a preview before the import). */
  pending: boolean;
};

export type SheetPedigreeSummary = {
  rows: PedigreeRowResult[];
  newAncestors: number;
  yours: number;
  recorded: number;
  withProblems: number;
};

/** Plans those pedigrees. Rows are reported against the animals sheet's own line numbers. */
export async function planSheetPedigrees(
  db: Db,
  ranchId: string,
  subjects: SheetPedigree[],
): Promise<Result<{ plan: PedigreePlan; summary: SheetPedigreeSummary }>> {
  const loaded = await loadKnown(db, ranchId);
  if (!loaded.ok) return loaded;
  const known = [...loaded.data];
  subjects.forEach((s, i) => {
    if (s.pending)
      known.push({
        id: `pending-${i}`,
        name: s.name,
        species: s.species,
        sex: s.sex,
        scope: "inventory",
        registry: null,
        registrationNumber: null,
        birthYear: null,
        color: null,
        height: null,
        breed: null,
        sireId: null,
        damId: null,
      });
  });
  const lines: number[] = [];
  const rows: string[][] = [];
  for (const s of subjects)
    for (const p of s.places) {
      rows.push([s.name, s.species, p.path, p.name]);
      lines.push(s.line);
    }
  const plan = planPedigreeImport({ header: ["animal", "species", "position", "name"], rows }, known);
  plan.rows.forEach((r) => (r.line = lines[r.line - 2] ?? r.line));
  const count = (o: PedigreeRowResult["outcome"]) => plan.rows.filter((r) => r.outcome === o).length;
  return ok({
    plan,
    summary: {
      rows: plan.rows,
      newAncestors: plan.newAncestors.length,
      yours: count("yours"),
      recorded: count("recorded"),
      withProblems: plan.rows.filter((r) => r.errors.length > 0).length,
    },
  });
}

export async function applyPedigreePlan(
  db: Db,
  ranchId: string,
  plan: PedigreePlan,
): Promise<Result<PedigreeImportResult>> {
  const problems: string[] = [];
  const names = new Map(plan.newAncestors.map((a) => [a.key, a.name]));

  // 1. New ancestors.
  const ids = new Map<string, string>();
  const made = await inBatches(plan.newAncestors, 6, async (a) => ({ a, r: await createAncestor(db, ranchId, a) }));
  for (const { a, r } of made) {
    if (r.ok) ids.set(a.key, r.data);
    else problems.push(`${a.name} could not be added: ${r.message}`);
  }

  // 2. Fill blanks on ancestors that were already recorded.
  const filledResults = await inBatches(plan.fills, 6, (f) => fillAncestor(db, ranchId, f));
  filledResults.forEach((r) => {
    if (!r.ok) problems.push(`Some details could not be filled in: ${r.message}`);
  });

  // 3. Links: each child gets its sire and dam in one step.
  const resolve = (r: Ref): string | null => ("id" in r ? r.id : (ids.get(r.key) ?? null));
  const nameOf = (r: Ref) => ("key" in r ? (names.get(r.key) ?? "an ancestor") : "an animal");
  const perChild = new Map<string, { sire_id?: string; dam_id?: string }>();
  for (const l of plan.links) {
    const child = resolve(l.child);
    const parent = resolve(l.parent);
    if (!child || !parent) {
      if (!parent) problems.push(`${nameOf(l.parent)} could not be linked because it was not added.`);
      continue;
    }
    perChild.set(child, { ...perChild.get(child), [l.role === "sire" ? "sire_id" : "dam_id"]: parent });
  }
  const linked = await inBatches([...perChild], 6, async ([child, parents]) => {
    const { data, error } = await db.from("animals").update(parents).eq("id", child).select("id");
    if (error) return { count: 0, message: dbErrorMessage(error) };
    return { count: data?.length ? Object.keys(parents).length : 0, message: null };
  });
  for (const l of linked) if (l.message) problems.push(l.message);

  return ok({
    created: ids.size,
    linked: linked.reduce((n, l) => n + l.count, 0),
    filled: plan.fills.length - filledResults.filter((r) => !r.ok).length,
    problems: [...new Set(problems)],
  });
}
