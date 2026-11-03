"use client";

import { useState } from "react";
import { useFieldErrors } from "@/components/admin/animals/edit-form";
import { Checkbox, RadioGroup, Select, TextInput } from "@/components/admin/forms";

export function StatusForm({
  animal,
}: {
  animal: {
    id: string;
    species: "horse" | "cattle";
    sex: string;
    is_published: boolean;
    is_featured: boolean;
    program_status: string;
    deceased_on: string | null;
    deceased_precision: "year" | "month" | "day";
  };
}) {
  const err = useFieldErrors();
  const [program, setProgram] = useState(animal.program_status || "active");
  const [y, m] = (animal.deceased_on ?? "").split("-");
  const referenceLabel = animal.species === "horse" ? "Previous stallion" : "Reference sire";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Checkbox
          name="is_published"
          defaultChecked={animal.is_published}
          label="Show on the website"
          hint="Turn this off to keep working on an animal privately."
        />
        <Checkbox name="is_featured" defaultChecked={animal.is_featured} label="Feature on the homepage" />
      </div>
      <RadioGroup
        name="program_status"
        legend="Status"
        value={program}
        onChange={setProgram}
        options={[
          { value: "active", label: "Active", hint: "Listed in its category." },
          { value: "retired", label: "Retired", hint: "Listed on the Retired page." },
          ...(animal.sex === "male"
            ? [{ value: "reference", label: referenceLabel, hint: `Listed on the ${referenceLabel}s page.` }]
            : []),
          { value: "deceased", label: "In Memory", hint: "Listed on the In Memory page, reached from About." },
        ]}
      />
      {program === "deceased" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Date of passing (optional)</legend>
          <div className="flex flex-wrap gap-3">
            <Select
              id="deceased_precision"
              name="deceased_precision"
              defaultValue={animal.deceased_precision}
              className="w-auto"
              aria-label="Precision"
            >
              <option value="year">Just the year</option>
              <option value="month">Month and year</option>
            </Select>
            <Select
              id="deceased_month"
              name="deceased_month"
              defaultValue={m ? String(Number(m)) : ""}
              className="w-auto"
              aria-label="Month (if known)"
            >
              <option value="">Month…</option>
              {[
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
              ].map((n, i) => (
                <option key={n} value={i + 1}>
                  {n}
                </option>
              ))}
            </Select>
            <TextInput
              id="deceased_year"
              name="deceased_year"
              inputMode="numeric"
              maxLength={4}
              defaultValue={y ?? ""}
              className="w-28"
              aria-label="Year"
              placeholder="Year"
            />
          </div>
          {err.deceased_on ? <p className="text-sm font-semibold text-[#8a2b1d]">{err.deceased_on}</p> : null}
        </fieldset>
      ) : null}
    </div>
  );
}
