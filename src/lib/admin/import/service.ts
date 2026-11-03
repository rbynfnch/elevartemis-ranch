/**
 * Spreadsheet import and export for animals. Plain functions over the owner's
 * Supabase client, so RLS applies. The rules for reading a sheet live in
 * ./animals.ts; this file does the database work around them.
 */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import { centsToDollars, docToText, textToDoc } from "@/lib/admin/form-values";
import type { Species } from "@/lib/domain/species";
import * as animals from "@/lib/admin/animals/service";
import type { Db, Result } from "@/lib/admin/animals/service";
import { attachExistingPhotos } from "@/lib/admin/library/service";
import { loadRanchCategories } from "@/lib/admin/animals/categories";
import { parseCsv, toCsv } from "./csv";
import { importColumns, planImport, type ImportContext, type ImportPlan, type PlannedAnimal } from "./animals";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

// ─── Looking things up ───────────────────────────────────────────────────────
async function loadContext(db: Db, ranchId: string, enabledSpecies: Species[]): Promise<Result<ImportContext>> {
  const [categories, plurals, photos, existing] = await Promise.all([
    loadRanchCategories(db, ranchId),
    db.from("animal_categories").select("id, label_plural"),
    db
      .from("media")
      .select("id, file_name")
      .eq("ranch_id", ranchId)
      .eq("status", "ready")
      .not("file_name", "is", null)
      .limit(5000),
    db
      .from("animals")
      .select("id, species, name")
      .eq("ranch_id", ranchId)
      .eq("record_scope", "inventory")
      .is("archived_at", null)
      .limit(5000),
  ]);
  for (const r of [plurals, photos, existing]) if (r.error) return fail(dbErrorMessage(r.error));
  const plural = new Map((plurals.data ?? []).map((c) => [c.id, c.label_plural]));
  return ok({
    enabledSpecies,
    categories: categories.map((c) => ({
      id: c.id,
      species: c.species,
      label: c.label,
      labelPlural: plural.get(c.id) ?? c.label,
      key: c.id.split(".")[1] ?? c.id,
      allowedSexes: c.allowedSexes,
    })),
    photos: (photos.data ?? []).map((p) => ({ id: p.id, name: p.file_name! })),
    existing: existing.data ?? [],
  });
}

// ─── Preview ─────────────────────────────────────────────────────────────────
export type PreviewRow = {
  line: number;
  name: string;
  action: "create" | "update" | null;
  errors: string[];
  warnings: string[];
  /** What this row will set, in plain words. */
  sets: string[];
};

export type ImportPreview = {
  fileErrors: string[];
  unknownColumns: string[];
  rows: PreviewRow[];
  toCreate: number;
  toUpdate: number;
  withProblems: number;
  skippedExamples: number;
  newBreeds: string[];
  restoredBreeds: string[];
  missingPhotos: string[];
};

const FIELD_LABELS: Record<string, string> = {
  category_id: "category",
  sex: "sex",
  breed: "breed",
  color: "color",
  registered_name: "registered name",
  registry: "registry",
  registration_number: "registration number",
  birth: "birth date",
  description: "description",
  status: "status",
  published: "website",
  featured: "featured",
  sale: "for sale",
  facts: "quick facts",
  photoIds: "photos",
};

async function planFrom(
  db: Db,
  ranchId: string,
  enabledSpecies: Species[],
  csvText: string,
): Promise<Result<ImportPlan>> {
  const ctx = await loadContext(db, ranchId, enabledSpecies);
  if (!ctx.ok) return ctx;
  return ok(planImport(parseCsv(csvText), ctx.data));
}

export async function previewImport(
  db: Db,
  ranchId: string,
  enabledSpecies: Species[],
  csvText: string,
): Promise<Result<ImportPreview>> {
  const planned = await planFrom(db, ranchId, enabledSpecies, csvText);
  if (!planned.ok) return planned;
  const plan = planned.data;

  const { data: breedRows, error } = await db
    .from("ranch_breeds")
    .select("species, name, hidden")
    .eq("ranch_id", ranchId);
  // The list may not exist yet on an older database; the preview just can't say which breeds are new.
  const known = new Map((error ? [] : (breedRows ?? [])).map((b) => [`${b.species}:${b.name.toLowerCase()}`, b]));
  const newBreeds: string[] = [];
  const restoredBreeds: string[] = [];
  if (!error) {
    for (const b of plan.breeds) {
      const hit = known.get(`${b.species}:${b.name.toLowerCase()}`);
      if (!hit) newBreeds.push(b.name);
      else if (hit.hidden) restoredBreeds.push(hit.name);
    }
  }

  const rows: PreviewRow[] = plan.results.map((r) => ({
    line: r.line,
    name: r.name,
    action: r.planned?.action ?? null,
    errors: r.errors,
    warnings: r.planned?.warnings ?? [],
    sets: r.planned ? Object.keys(r.planned.fields).map((k) => FIELD_LABELS[k] ?? k) : [],
  }));
  return ok({
    fileErrors: plan.fileErrors,
    unknownColumns: plan.unknownColumns,
    rows,
    toCreate: rows.filter((r) => r.action === "create").length,
    toUpdate: rows.filter((r) => r.action === "update").length,
    withProblems: rows.filter((r) => r.errors.length > 0).length,
    skippedExamples: plan.skippedExamples,
    newBreeds,
    restoredBreeds,
    missingPhotos: plan.missingPhotos,
  });
}

// ─── Saving ──────────────────────────────────────────────────────────────────
export type RowOutcome = { line: number; name: string; outcome: "created" | "updated" | "failed"; message?: string };
export type ImportResult = { outcomes: RowOutcome[]; created: number; updated: number; failed: number };

type Doc = NonNullable<ReturnType<typeof textToDoc>>;

async function applyRow(db: Db, ranchId: string, p: PlannedAnimal): Promise<RowOutcome> {
  const f = p.fields;
  const base = { line: p.line, name: p.name };
  const failed = (message: string): RowOutcome => ({ ...base, outcome: "failed", message });

  // ── The animal itself ────────────────────────────────────────────────────
  let id: string;
  let existing: animals.AnimalDetail | null = null;
  if (p.action === "create") {
    const created = await animals.createAnimal(db, ranchId, {
      species: p.species,
      category_id: f.category_id!,
      name: p.name,
      registered_name: f.registered_name ?? null,
      sex: f.sex as never,
      breed: f.breed ?? null,
      color: f.color ?? null,
      registry: f.registry ?? null,
      registration_number: f.registration_number ?? null,
      birth_date: f.birth?.date ?? null,
      birth_precision: f.birth?.precision ?? "year",
      description: textToDoc(f.description ?? null),
    });
    if (!created.ok) return failed(created.message);
    id = created.data.id;
  } else {
    id = p.existingId!;
    const loaded = await animals.getAnimal(db, ranchId, id);
    if (!loaded.ok) return failed(loaded.message);
    existing = loaded.data;
    const a = existing.animal;
    const updated = await animals.updateBasics(db, id, {
      species: p.species,
      category_id: f.category_id ?? a.category_id!,
      name: p.name,
      registered_name: f.registered_name ?? a.registered_name,
      sex: (f.sex ?? a.sex) as never,
      breed: f.breed ?? a.breed,
      color: f.color ?? a.color,
      registry: f.registry ?? a.registry,
      registration_number: f.registration_number ?? a.registration_number,
      birth_date: f.birth?.date ?? a.birth_date,
      birth_precision: f.birth?.precision ?? a.birth_precision,
      description: (f.description ? textToDoc(f.description) : a.description) as Doc | null,
    });
    if (!updated.ok) return failed(updated.message);
  }

  // From here the animal exists, so a problem is reported but the row still counts as saved.
  const notes: string[] = [];
  const note = (what: string, r: Result<unknown>) => {
    if (!r.ok) notes.push(`${what}: ${r.message}`);
  };

  // ── On the website ───────────────────────────────────────────────────────
  if (f.status || f.published !== undefined || f.featured !== undefined) {
    const a = existing?.animal;
    note(
      "website",
      await animals.saveStatus(db, id, {
        is_published: f.published ?? a?.is_published ?? true,
        is_featured: f.featured ?? a?.is_featured ?? false,
        program_status: f.status ?? a?.program_status ?? "active",
        deceased_on: f.status && f.status !== "deceased" ? null : (a?.deceased_on ?? null),
        deceased_precision: a?.deceased_precision ?? "year",
      }),
    );
  }

  // ── For sale ─────────────────────────────────────────────────────────────
  if (f.sale) {
    const s = existing?.sale;
    note(
      "for sale",
      await animals.saveSale(
        db,
        ranchId,
        id,
        f.sale.status === "none"
          ? null
          : {
              status: f.sale.status,
              price_mode:
                f.sale.status === "sold"
                  ? "hidden"
                  : f.sale.priceCents != null
                    ? "price"
                    : (s?.price_mode ?? "contact"),
              price_cents: f.sale.status === "sold" ? null : (f.sale.priceCents ?? s?.price_cents ?? null),
              available_on: s?.available_on ?? null,
              location_text: s?.location_text ?? null,
              sales_description: (s?.sales_description ?? null) as Doc | null,
              show_on_sold_page: s?.show_on_sold_page ?? true,
            },
      ),
    );
  }

  // ── Quick Facts: the sheet adds to or replaces by label; story sections are kept ──
  if (f.facts) {
    const merged = new Map((existing?.facts ?? []).map((x) => [x.label.toLowerCase(), x]));
    for (const fact of f.facts) merged.set(fact.label.toLowerCase(), fact);
    note(
      "quick facts",
      await animals.saveDetails(db, id, {
        facts: [...merged.values()],
        sections: (existing?.sections ?? []) as unknown as { heading: string; body: Doc }[],
      }),
    );
  }

  // ── Photos: the first one listed is the main photo ──────────────────────
  if (f.photoIds?.length) {
    const attached = await attachExistingPhotos(db, ranchId, id, f.photoIds);
    note("photos", attached);
    if (attached.ok) note("main photo", await animals.setMainPhoto(db, id, f.photoIds[0]));
  }

  return {
    ...base,
    outcome: p.action === "create" ? "created" : "updated",
    message: notes.length ? `Saved, but ${notes.join("; ")}` : undefined,
  };
}

export async function commitImport(
  db: Db,
  ranchId: string,
  enabledSpecies: Species[],
  csvText: string,
): Promise<Result<ImportResult>> {
  const planned = await planFrom(db, ranchId, enabledSpecies, csvText);
  if (!planned.ok) return planned;
  if (planned.data.fileErrors.length) return fail(planned.data.fileErrors[0]);

  const outcomes: RowOutcome[] = [];
  for (const r of planned.data.results) {
    if (r.planned) outcomes.push(await applyRow(db, ranchId, r.planned));
  }
  return ok({
    outcomes,
    created: outcomes.filter((o) => o.outcome === "created").length,
    updated: outcomes.filter((o) => o.outcome === "updated").length,
    failed: outcomes.filter((o) => o.outcome === "failed").length,
  });
}

// ─── Export ──────────────────────────────────────────────────────────────────
const birthText = (date: string | null, precision: string) =>
  !date ? "" : precision === "year" ? date.slice(0, 4) : precision === "month" ? date.slice(0, 7) : date;

/** Every animal as a spreadsheet in the same columns the importer reads, so an edited export can be uploaded back. */
export async function exportAnimalsCsv(db: Db, ranchId: string): Promise<Result<string>> {
  const [rows, categories, sales, facts, media] = await Promise.all([
    db
      .from("animals")
      .select("*")
      .eq("ranch_id", ranchId)
      .eq("record_scope", "inventory")
      .is("archived_at", null)
      .order("species")
      .order("name")
      .limit(5000),
    db.from("animal_categories").select("id, label_singular"),
    db.from("sale_listings").select("animal_id, status, price_cents").eq("ranch_id", ranchId),
    db.from("animal_facts").select("animal_id, label, value, sort_order").eq("ranch_id", ranchId).order("sort_order"),
    db
      .from("animal_media")
      .select("animal_id, sort_order, media ( file_name )")
      .eq("ranch_id", ranchId)
      .order("sort_order"),
  ]);
  for (const r of [rows, categories, sales, facts, media]) if (r.error) return fail(dbErrorMessage(r.error));

  const categoryLabel = new Map((categories.data ?? []).map((c) => [c.id, c.label_singular]));
  const saleOf = new Map((sales.data ?? []).map((s) => [s.animal_id, s]));
  const factsOf = new Map<string, string[]>();
  for (const f of facts.data ?? [])
    factsOf.set(f.animal_id, [...(factsOf.get(f.animal_id) ?? []), `${f.label}: ${f.value}`]);
  const photosOf = new Map<string, string[]>();
  for (const m of media.data ?? []) {
    const media_ = Array.isArray(m.media) ? m.media[0] : m.media;
    if (media_?.file_name) photosOf.set(m.animal_id, [...(photosOf.get(m.animal_id) ?? []), media_.file_name]);
  }

  const lines = (rows.data ?? []).map((a) => {
    const sale = saleOf.get(a.id);
    const cell: Record<(typeof importColumns)[number], string> = {
      id: a.id,
      name: a.name,
      species: a.species,
      category: categoryLabel.get(a.category_id ?? "") ?? "",
      sex: a.sex === "unknown" ? "" : a.sex,
      breed: a.breed ?? "",
      color: a.color ?? "",
      registered_name: a.registered_name ?? "",
      registry: a.registry ?? "",
      registration_number: a.registration_number ?? "",
      birth_date: birthText(a.birth_date, a.birth_precision),
      description: docToText(a.description as Json),
      status: a.program_status,
      published: a.is_published ? "yes" : "no",
      featured: a.is_featured ? "yes" : "no",
      for_sale: sale?.status ?? "none",
      price: sale?.price_cents != null ? centsToDollars(sale.price_cents) : "",
      quick_facts: (factsOf.get(a.id) ?? []).join("; "),
      photos: (photosOf.get(a.id) ?? []).join("; "),
    };
    return importColumns.map((c) => cell[c]);
  });
  return ok(toCsv([...importColumns], lines));
}
