"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/admin/animals/actions";
import { docToText } from "@/lib/admin/form-values";
import { Field, FormMessage, RadioGroup, Select, SubmitButton, TextArea, TextInput } from "@/components/admin/forms";

export type CategoryOption = { id: string; species: "horse" | "cattle"; label: string; allowedSexes: string[] };

type AnimalLike = {
  id: string;
  species: "horse" | "cattle";
  category_id: string | null;
  name: string;
  registered_name: string | null;
  sex: string;
  breed: string | null;
  color: string | null;
  registry: string | null;
  registration_number: string | null;
  birth_date: string | null;
  birth_precision: "year" | "month" | "day";
  description: unknown;
};

const sexLabels: Record<string, Record<string, string>> = {
  horse: { male: "Stallion / colt", female: "Mare / filly", gelding: "Gelding", unknown: "Not sure yet" },
  cattle: { male: "Bull", female: "Heifer / cow", steer: "Steer", unknown: "Not sure yet" },
};
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

export function BasicsForm({
  action,
  animal,
  categories,
  enabledSpecies,
  breedSuggestions,
  submitLabel,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  animal?: AnimalLike;
  categories: CategoryOption[];
  enabledSpecies: ("horse" | "cattle")[];
  breedSuggestions: string[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [species, setSpecies] = useState<"horse" | "cattle">(animal?.species ?? enabledSpecies[0] ?? "horse");
  const [categoryId, setCategoryId] = useState(animal?.category_id ?? "");
  const [precision, setPrecision] = useState(animal?.birth_precision ?? "year");
  const speciesCategories = categories.filter((c) => c.species === species);
  const category = speciesCategories.find((c) => c.id === categoryId);
  const sexes = category?.allowedSexes ?? ["male", "female", "unknown"];
  const [sex, setSex] = useState(animal?.sex ?? "");
  const [y, m, d] = (animal?.birth_date ?? "").split("-");
  const err = state.fieldErrors ?? {};
  const birthWord = species === "horse" ? "Foaling date" : "Calving date";

  return (
    <form action={formAction} className="max-w-2xl space-y-6" noValidate>
      <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      {animal ? <input type="hidden" name="id" value={animal.id} /> : null}

      {enabledSpecies.length > 1 && !animal ? (
        <RadioGroup
          name="species"
          legend="Horse or cattle?"
          inline
          value={species}
          onChange={(v) => {
            setSpecies(v as "horse" | "cattle");
            setCategoryId("");
            setSex("");
          }}
          options={enabledSpecies.map((s) => ({ value: s, label: s === "horse" ? "Horse" : "Cattle" }))}
        />
      ) : (
        <input type="hidden" name="species" value={species} />
      )}

      <Field id="name" label="Name" error={err.name}>
        <TextInput
          id="name"
          name="name"
          defaultValue={animal?.name}
          required
          maxLength={120}
          invalid={!!err.name}
          autoComplete="off"
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="category_id" label="Category" error={err.category_id}>
          <Select
            id="category_id"
            name="category_id"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              const next = speciesCategories.find((c) => c.id === e.target.value);
              if (next && !next.allowedSexes.includes(sex))
                setSex(next.allowedSexes.length === 1 ? next.allowedSexes[0] : "");
            }}
            invalid={!!err.category_id}
          >
            <option value="">Choose…</option>
            {speciesCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="sex" label="Sex" error={err.sex}>
          <Select id="sex" name="sex" value={sex} onChange={(e) => setSex(e.target.value)} invalid={!!err.sex}>
            <option value="">Choose…</option>
            {sexes.map((s) => (
              <option key={s} value={s}>
                {sexLabels[species][s] ?? s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{birthWord}</legend>
        <p className="text-sm text-ink-muted">Enter as much as you know. The website shows only that.</p>
        <div className="flex flex-wrap gap-3">
          <Select
            id="birth_precision"
            name="birth_precision"
            value={precision}
            onChange={(e) => setPrecision(e.target.value as typeof precision)}
            className="w-auto"
            aria-label="How much of the date do you know?"
          >
            <option value="year">Just the year</option>
            <option value="month">Month and year</option>
            <option value="day">Exact date</option>
          </Select>
          {precision !== "year" ? (
            <Select
              id="birth_month"
              name="birth_month"
              defaultValue={m ? String(Number(m)) : ""}
              className="w-auto"
              aria-label="Month"
            >
              <option value="">Month…</option>
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </Select>
          ) : null}
          {precision === "day" ? (
            <TextInput
              id="birth_day"
              name="birth_day"
              inputMode="numeric"
              defaultValue={d ? String(Number(d)) : ""}
              className="w-20"
              aria-label="Day"
              placeholder="Day"
            />
          ) : null}
          <TextInput
            id="birth_year"
            name="birth_year"
            inputMode="numeric"
            maxLength={4}
            defaultValue={y ?? ""}
            className="w-28"
            aria-label="Year"
            placeholder="Year"
          />
        </div>
        {err.birth_date ? <p className="text-sm font-semibold text-[#8a2b1d]">{err.birth_date}</p> : null}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="breed" label="Breed">
          <TextInput id="breed" name="breed" defaultValue={animal?.breed ?? ""} list="breed-suggestions" />
          <datalist id="breed-suggestions">
            {breedSuggestions.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
        <Field id="color" label="Color">
          <TextInput id="color" name="color" defaultValue={animal?.color ?? ""} />
        </Field>
      </div>

      <details
        className="border border-rule bg-white px-4 py-3"
        open={Boolean(animal?.registration_number || animal?.registered_name || animal?.registry)}
      >
        <summary className="cursor-pointer font-semibold">Registration</summary>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <Field id="registered_name" label="Registered name" hint="If different from the name above.">
            <TextInput
              id="registered_name"
              name="registered_name"
              defaultValue={animal?.registered_name ?? ""}
              hasHint
            />
          </Field>
          <Field id="registry" label="Registry">
            <TextInput
              id="registry"
              name="registry"
              defaultValue={animal?.registry ?? ""}
              list="registry-suggestions"
            />
            <datalist id="registry-suggestions">
              {(species === "horse" ? ["AQHA", "ApHC"] : ["American Hereford Association"]).map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
          <Field id="registration_number" label="Registration number">
            <TextInput
              id="registration_number"
              name="registration_number"
              defaultValue={animal?.registration_number ?? ""}
            />
          </Field>
        </div>
      </details>

      <Field
        id="description"
        label="Description"
        hint="Blank lines start new paragraphs. Leave it empty and the website simply won't show a description."
      >
        <TextArea
          id="description"
          name="description"
          rows={7}
          defaultValue={animal ? docToText(animal.description) : ""}
          hasHint
        />
      </Field>

      <SubmitButton pendingText="Saving…" className="sm:w-auto">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
