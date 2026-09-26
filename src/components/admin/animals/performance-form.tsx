"use client";

import { useActionState, useState } from "react";
import { savePerformanceAction } from "@/lib/admin/animals/actions";
import { commonEpdTraits, type EpdEntry } from "@/lib/animals/epd";
import { Field, FormMessage, SubmitButton, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

type Performance = {
  birth_weight_lb: number | null;
  weaning_weight_lb: number | null;
  weaning_weight_adj_lb: number | null;
  yearling_weight_lb: number | null;
  yearling_weight_adj_lb: number | null;
  adg_lb: number | null;
  adg_note: string | null;
  epds: unknown;
  epds_as_of: string | null;
  epds_source: string | null;
} | null;

const weights: [keyof NonNullable<Performance>, string][] = [
  ["birth_weight_lb", "Birth weight"],
  ["weaning_weight_lb", "Weaning weight (actual)"],
  ["weaning_weight_adj_lb", "Weaning weight (adjusted 205-day)"],
  ["yearling_weight_lb", "Yearling weight (actual)"],
  ["yearling_weight_adj_lb", "Yearling weight (adjusted 365-day)"],
];

export function PerformanceForm({ animalId, performance }: { animalId: string; performance: Performance }) {
  const [state, action] = useActionState(savePerformanceAction, {});
  const initial = ((performance?.epds as EpdEntry[] | undefined) ?? []).map((e) => ({
    trait: e.trait,
    value: String(e.value),
    accuracy: e.accuracy === undefined ? "" : String(e.accuracy),
    percentile: e.percentile === undefined ? "" : String(e.percentile),
  }));
  const [rows, setRows] = useState(initial.length ? initial : [{ trait: "", value: "", accuracy: "", percentile: "" }]);
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-8" noValidate>
      <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      <input type="hidden" name="id" value={animalId} />
      <fieldset>
        <legend className="text-sm font-semibold">Weights (pounds)</legend>
        <div className="mt-3 grid max-w-3xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {weights.map(([key, label]) => (
            <Field key={key} id={key} label={label} error={err[key]}>
              <TextInput
                id={key}
                name={key}
                inputMode="decimal"
                defaultValue={performance?.[key] != null ? String(performance[key]) : ""}
                invalid={!!err[key]}
              />
            </Field>
          ))}
          <Field id="adg_lb" label="Average daily gain (lb/day)" error={err.adg_lb}>
            <TextInput
              id="adg_lb"
              name="adg_lb"
              inputMode="decimal"
              defaultValue={performance?.adg_lb != null ? String(performance.adg_lb) : ""}
              invalid={!!err.adg_lb}
            />
          </Field>
        </div>
        <div className="mt-4 max-w-md">
          <Field id="adg_note" label="How gain was measured (optional)" hint="For example: on test, 112 days">
            <TextInput id="adg_note" name="adg_note" defaultValue={performance?.adg_note ?? ""} hasHint />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">EPDs</legend>
        <p className="max-w-[62ch] text-sm text-ink-muted">
          Copy them from the breed association&apos;s report. Accuracy and percentile rank are optional.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="text-ink-muted">
                <th className="pb-2 pr-3 font-semibold">Trait</th>
                <th className="pb-2 pr-3 font-semibold">EPD</th>
                <th className="pb-2 pr-3 font-semibold">Accuracy</th>
                <th className="pb-2 pr-3 font-semibold">Percentile</th>
                <th className="pb-2">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {(["trait", "value", "accuracy", "percentile"] as const).map((k) => (
                    <td key={k} className="pb-2 pr-3">
                      <TextInput
                        id={`epd_${k}_${i}`}
                        name={`epd_${k}`}
                        aria-label={`${k === "value" ? "EPD" : k} ${i + 1}`}
                        value={row[k]}
                        onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: e.target.value } : r)))}
                        list={k === "trait" ? "epd-traits" : undefined}
                        inputMode={k === "trait" ? "text" : "decimal"}
                        className="min-h-11"
                      />
                    </td>
                  ))}
                  <td className="pb-2">
                    <button
                      type="button"
                      className={buttonClasses("quiet")}
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="epd-traits">
            {commonEpdTraits.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </datalist>
        </div>
        <button
          type="button"
          className={buttonClasses("secondary")}
          onClick={() => setRows([...rows, { trait: "", value: "", accuracy: "", percentile: "" }])}
        >
          Add EPD
        </button>
        {err.epds ? <p className="text-sm font-semibold text-[#8a2b1d]">{err.epds}</p> : null}
        <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
          <Field id="epds_as_of" label="EPDs as of" error={err.epds_as_of}>
            <TextInput
              id="epds_as_of"
              name="epds_as_of"
              type="date"
              defaultValue={performance?.epds_as_of ?? ""}
              invalid={!!err.epds_as_of}
            />
          </Field>
          <Field id="epds_source" label="Source (optional)">
            <TextInput
              id="epds_source"
              name="epds_source"
              defaultValue={performance?.epds_source ?? ""}
              placeholder="American Hereford Association"
            />
          </Field>
        </div>
      </fieldset>
      <SubmitButton pendingText="Saving…" className="sm:w-auto">
        Save
      </SubmitButton>
    </form>
  );
}
