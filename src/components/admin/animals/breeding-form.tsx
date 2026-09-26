"use client";

import { useActionState, useState } from "react";
import { saveBreedingAction } from "@/lib/admin/animals/actions";
import { centsToDollars, docToText } from "@/lib/admin/form-values";
import {
  Checkbox,
  Field,
  FormMessage,
  RadioGroup,
  Select,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/admin/forms";

type Row = {
  status: "available" | "private_treaty" | "retired";
  stud_fee_cents: number | null;
  booking_fee_cents: number | null;
  collection_fee_cents: number | null;
  breeding_season: string | null;
  service_types: string[];
  service_type_other: string | null;
  shipping_info: unknown;
  female_requirements: unknown;
  live_offspring_guarantee: boolean | null;
  live_offspring_guarantee_terms: string | null;
  contract_url: string | null;
  additional_terms: unknown;
  cta_label: string | null;
  cta_url: string | null;
} | null;

export function BreedingForm({
  animalId,
  species,
  available,
  row,
}: {
  animalId: string;
  species: "horse" | "cattle";
  available: boolean;
  row: Row;
}) {
  const [state, action] = useActionState(saveBreedingAction, {});
  const [on, setOn] = useState(available);
  const [guarantee, setGuarantee] = useState(
    row?.live_offspring_guarantee === true ? "yes" : row?.live_offspring_guarantee === false ? "no" : "",
  );
  const err = state.fieldErrors ?? {};
  const horse = species === "horse";

  return (
    <form action={action} className="max-w-2xl space-y-6" noValidate>
      <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      <input type="hidden" name="id" value={animalId} />
      <Checkbox
        name="breeding_available"
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
        label={horse ? "Available for breeding" : "Available for breeding (AI sire)"}
        hint="Adds a Breeding Services section and badge to his page. Everything below is optional; only what you fill in is shown."
      />
      {on ? (
        <>
          <Field id="breeding_status" label="Breeding status">
            <Select
              id="breeding_status"
              name="breeding_status"
              defaultValue={row?.status ?? "available"}
              className="max-w-xs"
            >
              <option value="available">Available for Breeding</option>
              <option value="private_treaty">Private Treaty</option>
              <option value="retired">Retired from Breeding</option>
            </Select>
          </Field>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field id="stud_fee" label={horse ? "Stud fee ($)" : "Breeding fee ($)"} error={err.stud_fee}>
              <TextInput
                id="stud_fee"
                name="stud_fee"
                inputMode="decimal"
                defaultValue={centsToDollars(row?.stud_fee_cents)}
              />
            </Field>
            <Field id="booking_fee" label="Booking fee ($)" error={err.booking_fee}>
              <TextInput
                id="booking_fee"
                name="booking_fee"
                inputMode="decimal"
                defaultValue={centsToDollars(row?.booking_fee_cents)}
              />
            </Field>
            <Field id="collection_fee" label="Collection fee ($)" error={err.collection_fee}>
              <TextInput
                id="collection_fee"
                name="collection_fee"
                inputMode="decimal"
                defaultValue={centsToDollars(row?.collection_fee_cents)}
              />
            </Field>
          </div>
          <Field id="breeding_season" label="Breeding season" hint="For example: February 15 – July 15">
            <TextInput id="breeding_season" name="breeding_season" defaultValue={row?.breeding_season ?? ""} hasHint />
          </Field>
          <fieldset className="space-y-1">
            <legend className="text-sm font-semibold">Available as</legend>
            <div className="flex flex-wrap gap-x-6">
              {[
                ["live_cover", "Live cover"],
                ["fresh", "Fresh semen"],
                ["cooled", "Cooled semen"],
                ["frozen", "Frozen semen"],
              ].map(([v, l]) => (
                <Checkbox
                  key={v}
                  name="service_types"
                  value={v}
                  label={l}
                  defaultChecked={row?.service_types.includes(v)}
                />
              ))}
            </div>
            <Field id="service_type_other" label="Other (optional)">
              <TextInput
                id="service_type_other"
                name="service_type_other"
                defaultValue={row?.service_type_other ?? ""}
                className="max-w-sm"
              />
            </Field>
          </fieldset>
          <RadioGroup
            name="live_offspring_guarantee"
            legend={horse ? "Live foal guarantee" : "Live calf guarantee"}
            inline
            value={guarantee}
            onChange={setGuarantee}
            options={[
              { value: "", label: "Don't mention" },
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
          {guarantee ? (
            <Field id="live_offspring_guarantee_terms" label="Guarantee terms (optional)">
              <TextInput
                id="live_offspring_guarantee_terms"
                name="live_offspring_guarantee_terms"
                defaultValue={row?.live_offspring_guarantee_terms ?? ""}
              />
            </Field>
          ) : null}
          <Field id="shipping_info" label="Shipping information">
            <TextArea id="shipping_info" name="shipping_info" rows={3} defaultValue={docToText(row?.shipping_info)} />
          </Field>
          <Field id="female_requirements" label={horse ? "Mare requirements" : "Cow requirements"}>
            <TextArea
              id="female_requirements"
              name="female_requirements"
              rows={3}
              defaultValue={docToText(row?.female_requirements)}
            />
          </Field>
          <Field id="additional_terms" label="Additional breeding terms or information">
            <TextArea
              id="additional_terms"
              name="additional_terms"
              rows={4}
              defaultValue={docToText(row?.additional_terms)}
            />
          </Field>
          <Field
            id="contract_url"
            label="Breeding contract link (optional)"
            hint="A link to your contract (PDF upload arrives with the document tools)."
            error={err.contract_url}
          >
            <TextInput
              id="contract_url"
              name="contract_url"
              type="url"
              defaultValue={row?.contract_url ?? ""}
              placeholder="https://"
              hasHint
              invalid={!!err.contract_url}
            />
          </Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="cta_label" label="Button text" hint="Default: “Ask about breeding”">
              <TextInput id="cta_label" name="cta_label" maxLength={40} defaultValue={row?.cta_label ?? ""} hasHint />
            </Field>
            <Field
              id="cta_url"
              label="Booking link (optional)"
              hint="Leave empty and the button opens your inquiry form."
              error={err.cta_url}
            >
              <TextInput
                id="cta_url"
                name="cta_url"
                type="url"
                defaultValue={row?.cta_url ?? ""}
                placeholder="https://"
                hasHint
                invalid={!!err.cta_url}
              />
            </Field>
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-muted">Turning this off hides the section but keeps what you entered.</p>
      )}
      <SubmitButton pendingText="Saving…" className="sm:w-auto">
        Save
      </SubmitButton>
    </form>
  );
}
