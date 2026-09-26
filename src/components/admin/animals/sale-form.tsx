"use client";

import { useActionState, useState } from "react";
import { saveSaleAction } from "@/lib/admin/animals/actions";
import { centsToDollars, docToText } from "@/lib/admin/form-values";
import { Checkbox, Field, FormMessage, RadioGroup, SubmitButton, TextArea, TextInput } from "@/components/admin/forms";

type Sale = {
  status: "available" | "pending" | "sold";
  price_mode: "price" | "contact" | "hidden";
  price_cents: number | null;
  available_on: string | null;
  location_text: string | null;
  sales_description: unknown;
  show_on_sold_page: boolean;
} | null;

export function SaleForm({ animalId, sale }: { animalId: string; sale: Sale }) {
  const [state, action] = useActionState(saveSaleAction, {});
  const [status, setStatus] = useState<string>(sale?.status ?? "none");
  const [mode, setMode] = useState<string>(sale?.price_mode ?? "contact");
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="max-w-2xl space-y-6" noValidate>
      <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      <input type="hidden" name="id" value={animalId} />
      <RadioGroup
        name="sale_status"
        legend="Is this animal for sale?"
        value={status}
        onChange={setStatus}
        options={[
          { value: "none", label: "Not for sale" },
          { value: "available", label: "For sale", hint: "Appears on the For Sale page." },
          { value: "pending", label: "Sale pending", hint: "Stays on For Sale with a “Sale Pending” label." },
          { value: "sold", label: "Sold", hint: "Leaves For Sale. The portfolio, photos and pedigree stay." },
        ]}
      />
      {status !== "none" ? (
        <>
          {status !== "sold" ? (
            <>
              <RadioGroup
                name="price_mode"
                legend="Price"
                inline
                value={mode}
                onChange={setMode}
                options={[
                  { value: "contact", label: "Contact for price" },
                  { value: "price", label: "Show a price" },
                  { value: "hidden", label: "Don't mention price" },
                ]}
              />
              {mode === "price" ? (
                <Field id="price" label="Price (US dollars)" error={err.price}>
                  <TextInput
                    id="price"
                    name="price"
                    inputMode="decimal"
                    defaultValue={centsToDollars(sale?.price_cents)}
                    className="max-w-48"
                    invalid={!!err.price}
                  />
                </Field>
              ) : null}
              <div className="grid gap-6 sm:grid-cols-2">
                <Field id="available_on" label="Available from (optional)" error={err.available_on}>
                  <TextInput
                    id="available_on"
                    name="available_on"
                    type="date"
                    defaultValue={sale?.available_on ?? ""}
                  />
                </Field>
                <Field
                  id="location_text"
                  label="Location (optional)"
                  hint="Where a buyer would see or pick up the animal."
                >
                  <TextInput id="location_text" name="location_text" defaultValue={sale?.location_text ?? ""} hasHint />
                </Field>
              </div>
              <Field
                id="sales_description"
                label="Sale details (optional)"
                hint="Shown on the For Sale page and the animal's page."
              >
                <TextArea
                  id="sales_description"
                  name="sales_description"
                  defaultValue={docToText(sale?.sales_description)}
                  hasHint
                />
              </Field>
            </>
          ) : (
            <>
              <input type="hidden" name="price_mode" value="hidden" />
              <Checkbox
                name="show_on_sold_page"
                defaultChecked={sale?.show_on_sold_page ?? true}
                label="List on the Sold page"
                hint="Prices are never shown for sold animals."
              />
            </>
          )}
        </>
      ) : null}
      <SubmitButton pendingText="Saving…" className="sm:w-auto">
        Save
      </SubmitButton>
    </form>
  );
}
