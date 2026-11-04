"use client";

import { allBreedPedigreeUrl } from "@/lib/animals/external-pedigree";
import { useEffect, useRef, useState, type FormEvent } from "react";
import clsx from "clsx";
import {
  addAncestorAction,
  getAncestorAction,
  loadPedigreeAction,
  searchParentsAction,
  setParentAction,
  updateAncestorAction,
} from "@/lib/admin/pedigree/actions";
import type { ParentCandidate } from "@/lib/admin/pedigree/service";
import { bracketPlace, buildPedigree, parentPaths, type PedigreeNode } from "@/lib/animals/pedigree";
import { Field, FormMessage, TextArea, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

const MAX_DEPTH = 3;
type Role = "sire" | "dam";
type Target = { childId: string; childName: string; role: Role; current: PedigreeNode | null };

const roleOf = (path: string): Role => (path.endsWith("S") ? "sire" : "dam");
const roleWord = (role: Role) => (role === "sire" ? "Sire" : "Dam");

/** Every possible place in a three-generation pedigree: S, D, SS, SD, … */
const allPaths = (() => {
  const out: string[] = [];
  const add = (prefix: string) => {
    if (prefix.length >= MAX_DEPTH) return;
    for (const letter of ["S", "D"]) {
      out.push(prefix + letter);
      add(prefix + letter);
    }
  };
  add("");
  return out;
})();

/**
 * The owner's pedigree builder: the animal on the left, empty "+ Add sire" and
 * "+ Add dam" slots wherever a parent is missing. Each change is saved as soon as
 * it's made (like photos), because it edits other animals' records too.
 */
export function PedigreeBuilder({
  animalId,
  animalName,
  species,
  nodes: initial,
}: {
  animalId: string;
  animalName: string;
  species: "horse" | "cattle";
  nodes: PedigreeNode[];
}) {
  // The pedigree updates itself after each change, so the page never reloads or jumps to the top.
  const [nodes, setNodes] = useState(initial);
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    // Fresh data from the server for some other reason: adopt it.
    setLastInitial(initial);
    setNodes(initial);
  }
  const pedigree = buildPedigree(nodes);
  const [target, setTarget] = useState<Target | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // A slot is offered where its child exists (the animal itself, or an ancestor already filled in).
  const slots = allPaths.filter((p) => {
    const child = p.slice(0, -1);
    return child === "" || pedigree.ancestors.has(child);
  });

  function open(path: string) {
    const childPath = path.slice(0, -1);
    const child = childPath === "" ? { id: animalId, name: animalName } : pedigree.ancestors.get(childPath);
    if (!child) return;
    const id = "id" in child ? child.id : child.animalId;
    setTarget({
      childId: id,
      childName: child.name,
      role: roleOf(path),
      current: pedigree.ancestors.get(path) ?? null,
    });
  }

  const slot = (path: string) => {
    const node = pedigree.ancestors.get(path);
    return node ? (
      <Filled
        node={node}
        onChange={() => open(path)}
        onEdit={() => setEditing({ id: node.animalId, name: node.name })}
      />
    ) : (
      <Empty role={roleOf(path)} onAdd={() => open(path)} />
    );
  };

  const lookup = species === "horse" ? allBreedPedigreeUrl(animalName) : null;
  return (
    <div className="space-y-6">
      {lookup ? (
        <p className="text-sm text-ink-muted">
          Need the pedigree?{" "}
          <a
            href={lookup}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
          >
            Look up {animalName} on AllBreedPedigree
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          , then enter the names here. For a whole chart at once, use the pedigree import.
        </p>
      ) : null}
      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}

      {/* Wide screens: the bracket. */}
      <div
        className="hidden gap-x-6 lg:grid"
        style={{
          gridTemplateColumns: `repeat(${MAX_DEPTH + 1}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${2 ** MAX_DEPTH}, minmax(4rem, auto))`,
        }}
      >
        <div className="relative flex items-center" style={{ gridColumn: 1, gridRow: `1 / span ${2 ** MAX_DEPTH}` }}>
          <div className="w-full bg-primary/10 px-3 py-3">
            <p className="font-display text-lg">{animalName}</p>
            <p className="text-xs text-ink-muted">This animal</p>
          </div>
          <span aria-hidden="true" className="absolute -right-3 top-1/2 w-3 border-t border-ink-muted/50" />
        </div>
        {slots.map((path) => {
          const place = bracketPlace(path, MAX_DEPTH);
          const hasParents = parentPaths(path).some((p) => pedigree.ancestors.has(p));
          return (
            <div
              key={path}
              className="relative flex items-center py-1"
              style={{ gridColumn: place.column, gridRow: `${place.rowStart} / span ${place.rowSpan}` }}
            >
              <span aria-hidden="true" className="absolute -left-3 top-1/2 w-3 border-t border-ink-muted/50" />
              <span
                aria-hidden="true"
                className={clsx(
                  "absolute -left-3 border-l border-ink-muted/50",
                  path.endsWith("S") ? "top-1/2 bottom-0" : "top-0 h-1/2",
                )}
              />
              {slot(path)}
              {hasParents ? (
                <span aria-hidden="true" className="absolute -right-3 top-1/2 w-3 border-t border-ink-muted/50" />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Phones and tablets: a stacked list. */}
      <ul className="space-y-3 lg:hidden">
        <li>
          <div className="bg-primary/10 px-3 py-3">
            <p className="font-display text-lg">{animalName}</p>
            <p className="text-xs text-ink-muted">This animal</p>
          </div>
          <Branch path="" pedigree={pedigree} slot={slot} />
        </li>
      </ul>

      <p className="max-w-[62ch] text-sm text-ink-muted">
        Changes here save as you make them. Choose from your own animals, or add a horse you don&apos;t own, and it
        appears on the pedigree (as plain text) and in the sire&apos;s or dam&apos;s list of offspring.
      </p>

      <EditAncestorDialog
        ancestor={editing}
        species={species}
        onClose={() => setEditing(null)}
        onSaved={async (text) => {
          setEditing(null);
          setMessage({ tone: "success", text });
          const fresh = await loadPedigreeAction(animalId);
          if (fresh.ok) setNodes(fresh.data);
        }}
      />

      <ParentDialog
        target={target}
        species={species}
        onClose={() => setTarget(null)}
        onDone={async (text) => {
          setTarget(null);
          setMessage({ tone: "success", text });
          const fresh = await loadPedigreeAction(animalId);
          if (fresh.ok) setNodes(fresh.data);
          else
            setMessage({
              tone: "error",
              text: `${text} (The pedigree on screen may be out of date. Refresh the page.)`,
            });
        }}
      />
    </div>
  );
}

function Branch({
  path,
  pedigree,
  slot,
}: {
  path: string;
  pedigree: ReturnType<typeof buildPedigree>;
  slot: (path: string) => React.ReactNode;
}) {
  // Both parents are always offered under an animal that exists; deeper levels only under filled ones.
  if (path.length >= MAX_DEPTH) return null;
  if (path !== "" && !pedigree.ancestors.has(path)) return null;
  return (
    <ul className="ml-3 mt-3 space-y-3 border-l border-ink-muted/40 pl-4">
      {parentPaths(path).map((p) => (
        <li key={p}>
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {roleWord(roleOf(p))}
          </p>
          {slot(p)}
          <Branch path={p} pedigree={pedigree} slot={slot} />
        </li>
      ))}
    </ul>
  );
}

function Filled({ node, onChange, onEdit }: { node: PedigreeNode; onChange: () => void; onEdit: () => void }) {
  const link = "min-h-8 text-primary underline decoration-accent decoration-2 underline-offset-4";
  return (
    <div className="w-full bg-surface px-3 py-2 text-sm">
      <p className="font-semibold">{node.name}</p>
      {[node.color, node.height, node.birthYear].filter(Boolean).length ? (
        <p className="text-xs text-ink-muted">
          {[node.color, node.height, node.birthYear].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      {node.registration ? <p className="text-xs text-ink-muted">{node.registration}</p> : null}
      <p className="mt-0.5 text-xs text-ink-muted">{node.owned ? "Yours" : "Not owned"}</p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-4 text-xs">
        {node.owned ? (
          <a href={`/admin/animals/${node.animalId}`} className={link} aria-label={`Open ${node.name}'s page`}>
            Open
          </a>
        ) : (
          <button type="button" onClick={onEdit} className={link} aria-label={`Edit details for ${node.name}`}>
            Edit details
          </button>
        )}
        <button type="button" onClick={onChange} className={link} aria-label={`Change or remove ${node.name}`}>
          Change
        </button>
      </p>
    </div>
  );
}

function Empty({ role, onAdd }: { role: Role; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex min-h-14 w-full items-center justify-center border-2 border-dashed border-rule bg-white px-3 py-2 text-sm font-semibold text-primary hover:border-primary hover:bg-primary/5"
    >
      + Add {role}
    </button>
  );
}

// ─── Choosing or adding a parent ─────────────────────────────────────────────
function ParentDialog({
  target,
  species,
  onClose,
  onDone,
}: {
  target: Target | null;
  species: "horse" | "cattle";
  onClose: () => void;
  onDone: (message: string) => void | Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"mine" | "new">("mine");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ParentCandidate[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    registry: "",
    registrationNumber: "",
    birthYear: "",
    color: "",
    height: "",
    notes: "",
  });

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (target && !el.open) {
      setTab("mine");
      setQuery("");
      setResults(null);
      setError("");
      setForm({ name: "", registry: "", registrationNumber: "", birthYear: "", color: "", height: "", notes: "" });
      el.showModal();
    } else if (!target && el.open) el.close();
  }, [target]);

  // On the first tab the search box drives the list; on the second, the name being typed does ("did you mean…").
  const search = tab === "mine" ? query : form.name.trim().length >= 3 ? form.name : "";
  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      if (tab === "new" && !search) {
        setResults([]);
        return;
      }
      const r = await searchParentsAction(target.childId, target.role, search);
      if (cancelled) return;
      if (r.ok) setResults(r.data);
      else setError(r.message);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [target, tab, search]);

  async function choose(id: string, name: string) {
    if (!target) return;
    setBusy(true);
    setError("");
    const r = await setParentAction(target.childId, target.role, id);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onDone(`${name} is now ${target.childName}'s ${target.role}.`);
  }

  async function remove() {
    if (!target?.current) return;
    setBusy(true);
    setError("");
    const r = await setParentAction(target.childId, target.role, null);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onDone(`${target.current.name} was removed as ${target.childName}'s ${target.role}. Their record is kept.`);
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setError("");
    const year = Number(form.birthYear);
    const r = await addAncestorAction(target.childId, target.role, {
      name: form.name,
      registry: form.registry || null,
      registrationNumber: form.registrationNumber || null,
      birthYear: Number.isInteger(year) && year > 0 ? year : null,
      color: form.color || null,
      height: form.height || null,
      notes: form.notes || null,
    });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onDone(`${r.data.name} was added as ${target.childName}'s ${target.role}.`);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="parent-dialog-title"
      onClose={onClose}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] border border-rule bg-paper p-0 text-ink backdrop:bg-night/60"
    >
      <div className="flex h-[min(42rem,calc(100dvh-2rem))] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-rule px-6 py-4">
          <h3 id="parent-dialog-title" className="font-display text-2xl">
            {target ? `${roleWord(target.role)} of ${target.childName}` : ""}
          </h3>
          <button type="button" className={buttonClasses("quiet")} onClick={onClose}>
            Close
          </button>
        </div>

        <div role="tablist" aria-label="How to choose" className="flex border-b border-rule px-6">
          {(
            [
              ["mine", "From my records"],
              ["new", "Add one I don't own"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                setResults(null);
              }}
              className={clsx(
                "-mb-px min-h-11 border-b-2 px-4 text-sm font-semibold",
                tab === id ? "border-primary text-primary" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          <FormMessage tone="error">{error}</FormMessage>

          {tab === "mine" ? (
            <div>
              <label htmlFor="parent-search" className="text-sm font-semibold">
                Find by name
              </label>
              <TextInput
                id="parent-search"
                type="search"
                value={query}
                autoComplete="off"
                placeholder="Start typing a name"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          ) : (
            <form id="ancestor-form" onSubmit={add}>
              <AncestorFields form={form} onChange={setForm} species={species} />
            </form>
          )}

          {results === null ? (
            <p role="status" className="text-sm text-ink-muted">
              Looking…
            </p>
          ) : results.length === 0 ? (
            tab === "mine" ? (
              <p className="text-sm text-ink-muted">
                Nothing matches. Switch to &ldquo;Add one I don&apos;t own&rdquo; to add a new {target?.role}.
              </p>
            ) : null
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                {tab === "mine"
                  ? "Your animals and recorded ancestors"
                  : "Already in your records. Is it one of these?"}
              </p>
              <ul className="divide-y divide-rule border border-rule bg-white">
                {results.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {c.name}
                        {!c.owned ? <span className="ml-2 text-xs font-normal text-ink-muted">not owned</span> : null}
                      </p>
                      {c.detail ? <p className="text-xs text-ink-muted">{c.detail}</p> : null}
                    </div>
                    <button
                      type="button"
                      className={buttonClasses("secondary", "min-h-10 px-4 py-1.5 text-sm")}
                      disabled={busy}
                      onClick={() => void choose(c.id, c.name)}
                    >
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-6 py-4">
          {target?.current ? (
            <button
              type="button"
              className="min-h-11 text-[#8a2b1d] underline underline-offset-4"
              onClick={remove}
              disabled={busy}
            >
              Remove {target.current.name}
            </button>
          ) : (
            <span />
          )}
          {tab === "new" ? (
            <button
              type="submit"
              form="ancestor-form"
              className={buttonClasses("primary")}
              disabled={busy || !form.name.trim()}
            >
              {busy ? "Adding…" : `Add and use as ${target?.role ?? "parent"}`}
            </button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

type AncestorForm = {
  name: string;
  registry: string;
  registrationNumber: string;
  birthYear: string;
  color: string;
  height: string;
  notes: string;
};

/** The details of a horse the ranch doesn't own: the same fields when adding and when editing. */
function AncestorFields({
  form,
  onChange,
  species,
  idPrefix = "anc",
}: {
  form: AncestorForm;
  onChange: (form: AncestorForm) => void;
  species: "horse" | "cattle";
  idPrefix?: string;
}) {
  const set = (k: keyof AncestorForm) => (e: { target: { value: string } }) =>
    onChange({ ...form, [k]: e.target.value });
  const registries = species === "horse" ? ["AQHA", "ApHC", "APHA"] : ["American Hereford Association"];
  return (
    <div className="space-y-4">
      <Field id={`${idPrefix}-name`} label="Name" hint="As it appears on the registration papers.">
        <TextInput
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={set("name")}
          maxLength={120}
          required
          autoComplete="off"
          hasHint
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${idPrefix}-registry`} label="Registry">
          <TextInput
            id={`${idPrefix}-registry`}
            value={form.registry}
            onChange={set("registry")}
            list={`${idPrefix}-registries`}
          />
          <datalist id={`${idPrefix}-registries`}>
            {registries.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <Field id={`${idPrefix}-number`} label="Registration number">
          <TextInput id={`${idPrefix}-number`} value={form.registrationNumber} onChange={set("registrationNumber")} />
        </Field>
        <Field id={`${idPrefix}-year`} label="Year born (optional)">
          <TextInput
            id={`${idPrefix}-year`}
            inputMode="numeric"
            maxLength={4}
            value={form.birthYear}
            onChange={set("birthYear")}
          />
        </Field>
        <Field id={`${idPrefix}-color`} label="Color (optional)">
          <TextInput id={`${idPrefix}-color`} value={form.color} onChange={set("color")} />
        </Field>
        <Field id={`${idPrefix}-height`} label="Height (optional)" hint="Like 15.3hh.">
          <TextInput id={`${idPrefix}-height`} value={form.height} onChange={set("height")} maxLength={12} hasHint />
        </Field>
      </div>
      <Field id={`${idPrefix}-notes`} label="Notes (optional)" hint="Shown on this ancestor's card in the pedigree.">
        <TextArea id={`${idPrefix}-notes`} rows={3} value={form.notes} onChange={set("notes")} hasHint />
      </Field>
    </div>
  );
}

// ─── Editing a horse the ranch doesn't own ───────────────────────────────────
function EditAncestorDialog({
  ancestor,
  species,
  onClose,
  onSaved,
}: {
  ancestor: { id: string; name: string } | null;
  species: "horse" | "cattle";
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<AncestorForm | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (ancestor && !el.open) {
      setForm(null);
      setError("");
      el.showModal();
      void getAncestorAction(ancestor.id).then((r) => {
        if (!r.ok) return setError(r.message);
        setForm({
          name: r.data.name,
          registry: r.data.registry,
          registrationNumber: r.data.registrationNumber,
          birthYear: r.data.birthYear,
          color: r.data.color,
          height: r.data.height,
          notes: r.data.notes,
        });
      });
    } else if (!ancestor && el.open) el.close();
  }, [ancestor]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!ancestor || !form) return;
    setBusy(true);
    setError("");
    const year = Number(form.birthYear);
    const r = await updateAncestorAction(ancestor.id, {
      name: form.name,
      registry: form.registry || null,
      registrationNumber: form.registrationNumber || null,
      birthYear: Number.isInteger(year) && year > 0 ? year : null,
      color: form.color || null,
      height: form.height || null,
      notes: form.notes || null,
    });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    await onSaved(`${r.data.name} was updated.`);
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="edit-ancestor-title"
      onClose={onClose}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] border border-rule bg-paper p-0 text-ink backdrop:bg-night/60"
    >
      <form onSubmit={save} className="flex h-[min(40rem,calc(100dvh-2rem))] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-rule px-6 py-4">
          <h3 id="edit-ancestor-title" className="font-display text-2xl">
            Edit {ancestor?.name ?? "details"}
          </h3>
          <button type="button" className={buttonClasses("quiet")} onClick={onClose}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          <FormMessage tone="error">{error}</FormMessage>
          {form ? (
            <AncestorFields form={form} onChange={setForm} species={species} idPrefix="edit-anc" />
          ) : error ? null : (
            <p role="status" className="text-sm text-ink-muted">
              Loading…
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-rule px-6 py-4">
          <button type="button" className={buttonClasses("quiet")} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={buttonClasses("primary")} disabled={busy || !form?.name.trim()}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
