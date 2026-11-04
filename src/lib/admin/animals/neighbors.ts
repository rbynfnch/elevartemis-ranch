export type Stop = { id: string; name: string };

export type Neighbors = {
  prev: Stop | null;
  next: Stop | null;
  /** 1-based place of the current animal among the stops, and how many there are. */
  position: number;
  total: number;
};

/**
 * The animals either side of the current one, in the order the Animals list shows
 * them. `all` is every animal in that order; `inList` says which of them the list
 * (with its filter) includes. The current animal always counts, so an animal that
 * has just left a filtered list (it was in "No photo" and now has one) still has a
 * Previous and a Next.
 */
export function neighborsOf(all: Stop[], inList: Set<string>, currentId: string): Neighbors | null {
  const stops = all.filter((a) => a.id === currentId || inList.has(a.id));
  const index = stops.findIndex((a) => a.id === currentId);
  if (index === -1) return null;
  return {
    prev: index > 0 ? stops[index - 1] : null,
    next: index < stops.length - 1 ? stops[index + 1] : null,
    position: index + 1,
    total: stops.length,
  };
}
