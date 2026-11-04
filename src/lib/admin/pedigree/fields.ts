import { textToDoc } from "@/lib/admin/form-values";

export type AncestorInput = {
  name: string;
  registry?: string | null;
  registrationNumber?: string | null;
  birthYear?: number | null;
  color?: string | null;
  height?: string | null;
  breed?: string | null;
  notes?: string | null;
};

const clean = (v: string | null | undefined, max: number) => {
  const t = v?.trim();
  return t ? t.slice(0, max) : null;
};

/**
 * What the ancestor form saves, tidied: spaces collapsed, over-long text cut, an
 * implausible year dropped. The same rules apply when adding and when editing.
 */
export function ancestorColumns(input: AncestorInput) {
  const name = input.name.replace(/\s+/g, " ").trim();
  if (!name) return { ok: false as const, message: "Enter a name." };
  if (name.length > 120) return { ok: false as const, message: "Use 120 characters or fewer for the name." };
  const year =
    input.birthYear && input.birthYear >= 1800 && input.birthYear <= new Date().getFullYear() ? input.birthYear : null;
  return {
    ok: true as const,
    columns: {
      name,
      registry: clean(input.registry, 80),
      registration_number: clean(input.registrationNumber, 60),
      birth_date: year ? `${year}-01-01` : null,
      birth_precision: "year" as const,
      color: clean(input.color, 80),
      height: clean(input.height, 12),
      breed: clean(input.breed, 80),
      description: textToDoc(input.notes ?? null),
    },
  };
}
