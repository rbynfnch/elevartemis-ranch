import { describe, expect, it } from "vitest";
import { ancestorColumns } from "./fields";

describe("ancestorColumns", () => {
  it("tidies what the owner typed", () => {
    const r = ancestorColumns({
      name: "  High   Brow  Cat ",
      registry: " AQHA ",
      registrationNumber: "2706274",
      birthYear: 1989,
      color: "",
      notes: "Foundation sire.",
    });
    expect(r.ok && r.columns).toMatchObject({
      name: "High Brow Cat",
      registry: "AQHA",
      registration_number: "2706274",
      birth_date: "1989-01-01",
      birth_precision: "year",
      color: null,
    });
    expect(r.ok && r.columns.description).not.toBeNull();
  });
  it("needs a name and keeps it to 120 characters", () => {
    expect(ancestorColumns({ name: "   " }).ok).toBe(false);
    expect(ancestorColumns({ name: "a".repeat(121) }).ok).toBe(false);
  });
  it("drops a year that can't be right, and leaves empty notes empty", () => {
    const r = ancestorColumns({ name: "X", birthYear: 1066 });
    expect(r.ok && r.columns.birth_date).toBeNull();
    expect(r.ok && r.columns.description).toBeNull();
  });
});
