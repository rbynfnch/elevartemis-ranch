"use client";

import { useActionState, useState } from "react";
import { saveDetailsAction } from "@/lib/admin/animals/actions";
import { docToText } from "@/lib/admin/form-values";
import { Field, FormMessage, SubmitButton, TextArea, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

const suggestions = {
  horse: ["Height", "Discipline", "Performance record", "Earnings", "Offspring earnings", "Temperament", "Training"],
  cattle: ["Ear tag", "Tattoo", "Polled or horned", "Frame score", "Disposition", "Calving ease"],
};

function move<T>(list: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= list.length) return list;
  const copy = [...list];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

/** Quick Facts (short label/value lines) and longer story sections, as the owner likes. */
export function DetailsEditor({
  animalId,
  species,
  facts: initialFacts,
  sections: initialSections,
}: {
  animalId: string;
  species: "horse" | "cattle";
  facts: { label: string; value: string }[];
  sections: { heading: string; body: unknown }[];
}) {
  const [state, action] = useActionState(saveDetailsAction, {});
  const [facts, setFacts] = useState(initialFacts);
  const [sections, setSections] = useState(
    initialSections.map((s) => ({ heading: s.heading, body: docToText(s.body) })),
  );

  return (
    <form action={action} className="max-w-3xl space-y-10">
      <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      <input type="hidden" name="id" value={animalId} />
      <input type="hidden" name="facts" value={JSON.stringify(facts)} />
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />

      <fieldset className="space-y-3">
        <legend className="font-semibold">Quick Facts</legend>
        <p className="text-sm text-ink-muted">Short details shown beside the photos, like height or discipline.</p>
        {facts.map((f, i) => (
          <div key={i} className="grid items-end gap-3 sm:grid-cols-[12rem_1fr_auto]">
            <Field id={`fact-label-${i}`} label="Label">
              <TextInput
                id={`fact-label-${i}`}
                value={f.label}
                list="fact-suggestions"
                maxLength={60}
                onChange={(e) => setFacts(facts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
            </Field>
            <Field id={`fact-value-${i}`} label="Value">
              <TextInput
                id={`fact-value-${i}`}
                value={f.value}
                maxLength={300}
                onChange={(e) => setFacts(facts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
              />
            </Field>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label={`Move ${f.label || "fact"} up`}
                className="min-h-11 min-w-11 border border-rule"
                onClick={() => setFacts(move(facts, i, -1))}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Move ${f.label || "fact"} down`}
                className="min-h-11 min-w-11 border border-rule"
                onClick={() => setFacts(move(facts, i, 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className={buttonClasses("quiet", "px-2")}
                onClick={() => setFacts(facts.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <datalist id="fact-suggestions">
          {suggestions[species].map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button
          type="button"
          className={buttonClasses("secondary")}
          onClick={() => setFacts([...facts, { label: "", value: "" }])}
        >
          Add a fact
        </button>
        {state.fieldErrors?.facts ? (
          <p className="text-sm font-semibold text-[#8a2b1d]">{state.fieldErrors.facts}</p>
        ) : null}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-semibold">Stories and notes</legend>
        <p className="text-sm text-ink-muted">
          Longer sections with their own heading, like “Breeding notes” or “History”.
        </p>
        {sections.map((s, i) => (
          <div key={i} className="space-y-3 border border-rule bg-white p-4">
            <Field id={`section-heading-${i}`} label="Heading">
              <TextInput
                id={`section-heading-${i}`}
                value={s.heading}
                maxLength={120}
                onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, heading: e.target.value } : x)))}
              />
            </Field>
            <Field id={`section-body-${i}`} label="Text">
              <TextArea
                id={`section-body-${i}`}
                value={s.body}
                onChange={(e) => setSections(sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="min-h-11 border border-rule px-3"
                onClick={() => setSections(move(sections, i, -1))}
              >
                Move up
              </button>
              <button
                type="button"
                className="min-h-11 border border-rule px-3"
                onClick={() => setSections(move(sections, i, 1))}
              >
                Move down
              </button>
              <button
                type="button"
                className={buttonClasses("quiet")}
                onClick={() => setSections(sections.filter((_, j) => j !== i))}
              >
                Remove section
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className={buttonClasses("secondary")}
          onClick={() => setSections([...sections, { heading: "", body: "" }])}
        >
          Add a section
        </button>
        {state.fieldErrors?.sections ? (
          <p className="text-sm font-semibold text-[#8a2b1d]">{state.fieldErrors.sections}</p>
        ) : null}
      </fieldset>

      <SubmitButton pendingText="Saving…" className="sm:w-auto">
        Save facts and stories
      </SubmitButton>
    </form>
  );
}
