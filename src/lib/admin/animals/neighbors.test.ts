import { describe, expect, it } from "vitest";
import { neighborsOf, type Stop } from "./neighbors";

const all: Stop[] = ["a", "b", "c", "d", "e"].map((id) => ({ id, name: id.toUpperCase() }));

describe("neighborsOf", () => {
  it("finds the animals either side in list order", () => {
    const n = neighborsOf(all, new Set(all.map((a) => a.id)), "c")!;
    expect([n.prev?.id, n.next?.id, n.position, n.total]).toEqual(["b", "d", 3, 5]);
  });
  it("has no previous at the start and no next at the end", () => {
    const first = neighborsOf(all, new Set(all.map((a) => a.id)), "a")!;
    expect([first.prev, first.next?.id]).toEqual([null, "b"]);
    const last = neighborsOf(all, new Set(all.map((a) => a.id)), "e")!;
    expect([last.prev?.id, last.next]).toEqual(["d", null]);
  });
  it("skips animals a filter leaves out", () => {
    const n = neighborsOf(all, new Set(["a", "c", "e"]), "c")!;
    expect([n.prev?.id, n.next?.id, n.position, n.total]).toEqual(["a", "e", 2, 3]);
  });
  it("still works for an animal that just left the filtered list", () => {
    // "c" had no photo and now has one, so the filter no longer includes it.
    const n = neighborsOf(all, new Set(["a", "d", "e"]), "c")!;
    expect([n.prev?.id, n.next?.id, n.total]).toEqual(["a", "d", 4]);
  });
  it("returns null when the animal isn't in the list at all", () => {
    expect(neighborsOf(all, new Set(), "zzz")).toBeNull();
  });
});
