/**
 * Searching, filtering and sorting the for-sale animals in the browser. Filters
 * offer only values the animals actually have, so a ranch with no recorded
 * heights or colors never sees an empty filter.
 */
import type { ListingCard } from "./cards";

export type SaleFilters = {
  q: string;
  breed: string;
  sex: string;
  year: string;
  color: string;
  /** Whole dollars. */
  minPrice: number | null;
  maxPrice: number | null;
};

export const noFilters: SaleFilters = {
  q: "",
  breed: "",
  sex: "",
  year: "",
  color: "",
  minPrice: null,
  maxPrice: null,
};

export type SortKey = "ranch" | "youngest" | "oldest" | "price_low" | "price_high" | "name";

export const sortLabels: Record<SortKey, string> = {
  ranch: "Ranch order",
  youngest: "Youngest first",
  oldest: "Oldest first",
  price_low: "Price: low to high",
  price_high: "Price: high to low",
  name: "Name A–Z",
};

const sexLabels: Record<string, string> = { male: "Male", female: "Female", gelding: "Gelding", steer: "Steer" };

export type Facets = {
  breeds: string[];
  sexes: { value: string; label: string }[];
  years: number[];
  colors: string[];
  price: { min: number; max: number } | null;
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function distinct(values: (string | null | undefined)[]): string[] {
  const seen = new Map<string, string>();
  for (const v of values) {
    const t = v?.trim();
    if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function buildFacets(cards: ListingCard[]): Facets {
  const prices = cards.map((c) => c.priceCents).filter((p): p is number => p != null);
  const sexes = [...new Set(cards.map((c) => c.sex).filter((s): s is string => Boolean(s && sexLabels[s])))];
  return {
    breeds: distinct(cards.map((c) => c.breed)),
    sexes: sexes.map((value) => ({ value, label: sexLabels[value] })),
    years: [...new Set(cards.map((c) => c.birthYear).filter((y): y is number => Boolean(y)))].sort((a, b) => b - a),
    colors: distinct(cards.map((c) => c.color)),
    price: prices.length
      ? { min: Math.floor(Math.min(...prices) / 100), max: Math.ceil(Math.max(...prices) / 100) }
      : null,
  };
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function matchesSearch(card: ListingCard, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [
    card.name,
    card.breed,
    card.color,
    card.categoryLabel,
    card.tagline,
    card.registry,
    card.registrationNumber,
    card.earTag,
    card.birthYear ? String(card.birthYear) : null,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const squashed = squash(haystack);
  // Every word must be found; a registration number is found however it is punctuated.
  return words.every((w) => haystack.includes(w) || (squash(w).length > 2 && squashed.includes(squash(w))));
}

export function applyFilters(cards: ListingCard[], f: SaleFilters): ListingCard[] {
  return cards.filter((c) => {
    if (!matchesSearch(c, f.q)) return false;
    if (f.breed && !(c.breed && same(c.breed, f.breed))) return false;
    if (f.sex && c.sex !== f.sex) return false;
    if (f.year && String(c.birthYear ?? "") !== f.year) return false;
    if (f.color && !(c.color && same(c.color, f.color))) return false;
    // An animal with no listed price can't be inside a price range.
    if (f.minPrice != null && (c.priceCents == null || c.priceCents < f.minPrice * 100)) return false;
    if (f.maxPrice != null && (c.priceCents == null || c.priceCents > f.maxPrice * 100)) return false;
    return true;
  });
}

export const activeFilterCount = (f: SaleFilters) =>
  [f.q.trim(), f.breed, f.sex, f.year, f.color, f.minPrice, f.maxPrice].filter((v) => v !== "" && v !== null).length;

export function sortCards(cards: ListingCard[], key: SortKey): ListingCard[] {
  const list = [...cards];
  const byName = (a: ListingCard, b: ListingCard) => a.name.localeCompare(b.name);
  // Missing values go last whichever way it sorts.
  const num = (get: (c: ListingCard) => number | null, dir: 1 | -1) => (a: ListingCard, b: ListingCard) => {
    const x = get(a);
    const y = get(b);
    if (x == null && y == null) return byName(a, b);
    if (x == null) return 1;
    if (y == null) return -1;
    return (x - y) * dir || byName(a, b);
  };
  switch (key) {
    case "youngest":
      return list.sort(num((c) => c.birthYear ?? null, -1));
    case "oldest":
      return list.sort(num((c) => c.birthYear ?? null, 1));
    case "price_low":
      return list.sort(num((c) => c.priceCents, 1));
    case "price_high":
      return list.sort(num((c) => c.priceCents, -1));
    case "name":
      return list.sort(byName);
    default:
      // The owner's order, with featured animals leading.
      return list.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || a.displayOrder - b.displayOrder || byName(a, b),
      );
  }
}
