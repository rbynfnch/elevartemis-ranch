import type { ListingCard } from "@/lib/animals/cards";

export type YearGroup = { year: number | null; animals: ListingCard[] };

/**
 * Foals and calves are listed by the year they were born, newest year first.
 * An animal with no birth year goes in a group of its own at the end, with no
 * heading, so an unknown year is never labelled as one.
 */
export function groupByBirthYear(animals: ListingCard[]): YearGroup[] {
  const byYear = new Map<number | null, ListingCard[]>();
  for (const a of animals) {
    const year = a.birthYear ?? null;
    byYear.set(year, [...(byYear.get(year) ?? []), a]);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([year, list]) => ({ year, animals: list }));
}

/** The animals of one category, in the ranch's category order, skipping categories with none. */
export function groupByCategory<C extends { id: string }>(
  animals: ListingCard[],
  categories: C[],
): { category: C; animals: ListingCard[] }[] {
  return categories
    .map((category) => ({ category, animals: animals.filter((a) => a.categoryId === category.id) }))
    .filter((g) => g.animals.length > 0);
}
