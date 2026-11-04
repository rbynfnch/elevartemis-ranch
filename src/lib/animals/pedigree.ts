import type { Database } from "@/lib/database.types";
import { speciesTerms, type Species } from "@/lib/domain/species";

export type PedigreeRow = Database["public"]["Functions"]["get_pedigree"]["Returns"][number];

/** One animal in a pedigree. `path` says where: "" is the animal, "S" the sire, "SD" the sire's dam, and so on. */
export type PedigreeNode = {
  path: string;
  generation: number;
  animalId: string;
  name: string;
  registeredName: string | null;
  /** "AQHA #2706274", or null when nothing is recorded. */
  registration: string | null;
  breed: string | null;
  color: string | null;
  birthYear: number | null;
  sex: string;
  /** The ranch owns this animal. False for an ancestor entered only for the pedigree. */
  owned: boolean;
  /** Where its own page is, when it has a public one; otherwise plain text. */
  href: string | null;
  /** An outside ancestor's notes, shown on its card. */
  notes: unknown;
};

export function registrationText(
  registry: string | null | undefined,
  number: string | null | undefined,
): string | null {
  const n = number?.trim();
  if (!n) return null;
  const r = registry?.trim();
  return r ? `${r} #${n}` : `#${n}`;
}

export function toNodes(rows: PedigreeRow[]): PedigreeNode[] {
  return rows.map((r) => ({
    path: r.path,
    generation: r.generation,
    animalId: r.animal_id,
    name: r.name,
    registeredName: r.registered_name ?? null,
    registration: registrationText(r.registry, r.registration_number),
    breed: r.breed ?? null,
    color: r.color ?? null,
    birthYear: r.birth_year ?? null,
    sex: r.sex,
    owned: r.record_scope === "inventory",
    href: r.is_linkable && r.slug ? `/${speciesTerms[r.species as Species].path}/${r.slug}` : null,
    notes: r.notes ?? null,
  }));
}

export type Pedigree = {
  self: PedigreeNode | null;
  ancestors: Map<string, PedigreeNode>;
  /** The furthest generation with anyone in it (0 when there are no ancestors). */
  depth: number;
};

export function buildPedigree(nodes: PedigreeNode[]): Pedigree {
  const ancestors = new Map<string, PedigreeNode>();
  let self: PedigreeNode | null = null;
  let depth = 0;
  for (const n of nodes) {
    if (n.path === "") self = n;
    else {
      ancestors.set(n.path, n);
      depth = Math.max(depth, n.generation);
    }
  }
  return { self, ancestors, depth };
}

/** Where a path sits in a bracket with `depth` generations: its column and the rows it spans (rows are 1-based). */
export function bracketPlace(path: string, depth: number): { column: number; rowStart: number; rowSpan: number } {
  const generation = path.length;
  const rowSpan = 2 ** (depth - generation);
  let index = 0;
  for (const letter of path) index = index * 2 + (letter === "D" ? 1 : 0);
  return { column: generation + 1, rowStart: index * rowSpan + 1, rowSpan };
}

export const parentPaths = (path: string) => [`${path}S`, `${path}D`] as const;
