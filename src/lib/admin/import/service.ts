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
import {
  applyPedigreePlan,
  planSheetPedigrees,
  type PedigreeImportResult,
  type SheetPedigree,
  type SheetPedigreeSummary,
} from "./pedigree-service";
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
      .select("id, species, name, program_status")
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
    existing: (existing.data ?? []).map(({ program_status, ...e }) => ({
      ...e,
      inMemory: program_status === "deceased",
    })),
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
  /** What the sire, dam and grandparent columns will do; null when the sheet has none. */
  pedigree: SheetPedigreeSummary | null;
};

const FIELD_LABELS: Record<string, string> = {
  category_id: "category",
  sex: "sex",
  breed: "breed",
  color: "color",
  height: "height",
  ear_tag: "ear tag",
  weight_lb: "weight",
  head_count: "head count",
  price_basis: "what the price means",
  tagline: "tagline",
  highlights: "highlights",
  video_url: "video link",
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

  const subjects = pedigreeSubjects(plan, true);
  let pedigree: SheetPedigreeSummary | null = null;
  if (subjects.length) {
    const planned = await planSheetPedigrees(db, ranchId, subjects);
    if (planned.ok) pedigree = planned.data.summary;
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
    pedigree,
  });
}

// ─── Saving ──────────────────────────────────────────────────────────────────
export type RowOutcome = { line: number; name: string; outcome: "created" | "updated" | "failed"; message?: string };
export type ImportResult = {
  outcomes: RowOutcome[];
  created: number;
  updated: number;
  failed: number;
  /** What the pedigree columns did, when the sheet had any. */
  pedigree: PedigreeImportResult | null;
};

/** The animals in a plan that name a sire, dam or grandparents. `pending` marks ones the import hasn't made yet. */
function pedigreeSubjects(plan: ImportPlan, pending: boolean, only?: Set<number>): SheetPedigree[] {
  const out: SheetPedigree[] = [];
  for (const r of plan.results) {
    const p = r.planned;
    if (!p?.fields.pedigree?.length || (only && !only.has(p.line))) continue;
    out.push({
      line: p.line,
      name: p.name,
      registeredName: p.fields.registered_name ?? null,
      species: p.species,
      sex: p.fields.sex ?? "unknown",
      places: p.fields.pedigree,
      pending: pending && p.action === "create",
    });
  }
  return out;
}

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
      height: f.height ?? null,
      ear_tag: f.ear_tag ?? null,
      weight_lb: f.weight_lb ?? null,
      head_count: f.head_count ?? null,
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
      height: f.height ?? a.height ?? null,
      ear_tag: f.ear_tag ?? a.ear_tag ?? null,
      weight_lb: f.weight_lb ?? a.weight_lb ?? null,
      head_count: f.head_count ?? a.head_count ?? null,
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

  // ── Tagline, highlights and video link ───────────────────────────────────
  if (f.tagline !== undefined || f.highlights !== undefined || f.video_url !== undefined) {
    const a = existing?.animal;
    note(
      "headline",
      await animals.saveProfile(db, ranchId, id, {
        tagline: f.tagline ?? a?.tagline ?? null,
        highlights: f.highlights ?? a?.highlights ?? [],
        video_url: f.video_url ?? existing?.videoUrl ?? null,
      }),
    );
  }

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
              price_basis: f.price_basis ?? (s?.price_basis as "each" | "per_head" | "total" | undefined) ?? "each",
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

  // Sire, dam and grandparents come last, once every animal in the sheet exists to be linked to.
  let pedigree: PedigreeImportResult | null = null;
  const saved = new Set(outcomes.filter((o) => o.outcome !== "failed").map((o) => o.line));
  const subjects = pedigreeSubjects(planned.data, false, saved);
  if (subjects.length) {
    const pedigreePlan = await planSheetPedigrees(db, ranchId, subjects);
    if (pedigreePlan.ok) {
      const applied = await applyPedigreePlan(db, ranchId, pedigreePlan.data.plan);
      pedigree = applied.ok
        ? {
            ...applied.data,
            problems: [
              ...pedigreePlan.data.summary.rows.flatMap((r) => r.errors.map((e) => `Row ${r.line}, ${r.name}: ${e}`)),
              ...applied.data.problems,
            ],
          }
        : { created: 0, linked: 0, filled: 0, problems: [applied.message] };
    } else pedigree = { created: 0, linked: 0, filled: 0, problems: [pedigreePlan.message] };
  }

  return ok({
    pedigree,
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
  const [rows, categories, sales, facts, media, videos, family] = await Promise.all([
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
    db.from("sale_listings").select("*").eq("ranch_id", ranchId),
    db.from("animal_facts").select("animal_id, label, value, sort_order").eq("ranch_id", ranchId).order("sort_order"),
    db
      .from("animal_media")
      .select("animal_id, sort_order, media ( file_name )")
      .eq("ranch_id", ranchId)
      .order("sort_order"),
    db.from("animal_videos").select("animal_id, url, sort_order").eq("ranch_id", ranchId).order("sort_order"),
    // Everyone recorded (the ranch's animals and outside ancestors) so sires and dams can be named.
    db.from("animals").select("id, name, sire_id, dam_id").eq("ranch_id", ranchId).is("archived_at", null).limit(5000),
  ]);
  // (A missing videos table on an older database just means no video links in the export.)
  for (const r of [rows, categories, sales, facts, media, family]) if (r.error) return fail(dbErrorMessage(r.error));

  const categoryLabel = new Map((categories.data ?? []).map((c) => [c.id, c.label_singular]));
  const saleOf = new Map((sales.data ?? []).map((s) => [s.animal_id, s]));
  const factsOf = new Map<string, string[]>();
  for (const f of facts.data ?? [])
    factsOf.set(f.animal_id, [...(factsOf.get(f.animal_id) ?? []), `${f.label}: ${f.value}`]);
  const videoOf = new Map<string, string>();
  for (const v of videos.data ?? []) if (!videoOf.has(v.animal_id)) videoOf.set(v.animal_id, v.url);
  const photosOf = new Map<string, string[]>();
  for (const m of media.data ?? []) {
    const media_ = Array.isArray(m.media) ? m.media[0] : m.media;
    if (media_?.file_name) photosOf.set(m.animal_id, [...(photosOf.get(m.animal_id) ?? []), media_.file_name]);
  }

  const person = new Map((family.data ?? []).map((p) => [p.id, p]));
  const nameOf = (id: string | null | undefined) => (id ? (person.get(id)?.name ?? "") : "");
  const parentsOf = (id: string | null) => (id ? person.get(id) : undefined);

  const lines = (rows.data ?? []).map((a) => {
    const sire = parentsOf(a.sire_id);
    const dam = parentsOf(a.dam_id);
    const ped = {
      sire: nameOf(a.sire_id),
      dam: nameOf(a.dam_id),
      sire_sire: nameOf(sire?.sire_id),
      sire_dam: nameOf(sire?.dam_id),
      dam_sire: nameOf(dam?.sire_id),
      dam_dam: nameOf(dam?.dam_id),
    };
    const sale = saleOf.get(a.id);
    const cell: Record<(typeof importColumns)[number], string> = {
      id: a.id,
      name: a.name,
      species: a.species,
      category: categoryLabel.get(a.category_id ?? "") ?? "",
      sex: a.sex === "unknown" ? "" : a.sex,
      breed: a.breed ?? "",
      color: a.color ?? "",
      height: a.height ?? "",
      ear_tag: a.ear_tag ?? "",
      weight_lb: a.weight_lb != null ? String(a.weight_lb) : "",
      head_count: a.head_count != null ? String(a.head_count) : "",
      registered_name: a.registered_name ?? "",
      registry: a.registry ?? "",
      registration_number: a.registration_number ?? "",
      ...ped,
      birth_date: birthText(a.birth_date, a.birth_precision),
      tagline: a.tagline ?? "",
      description: docToText(a.description as Json),
      highlights: (a.highlights ?? []).join("; "),
      video_url: videoOf.get(a.id) ?? "",
      status: a.program_status,
      published: a.is_published ? "yes" : "no",
      featured: a.is_featured ? "yes" : "no",
      for_sale: sale?.status ?? "none",
      price: sale?.price_cents != null ? centsToDollars(sale.price_cents) : "",
      price_basis: sale?.price_basis ?? "",
      quick_facts: (factsOf.get(a.id) ?? []).join("; "),
      photos: (photosOf.get(a.id) ?? []).join("; "),
    };
    return importColumns.map((c) => cell[c]);
  });
  return ok(toCsv([...importColumns], lines));
}
