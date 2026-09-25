import { describe, expect, it } from "vitest";
import { birthLine, formatBirthDate } from "./species";

describe("formatBirthDate", () => {
  it("shows only the precision the owner entered", () => {
    expect(formatBirthDate("2026-04-02", "day")).toBe("April 2, 2026");
    expect(formatBirthDate("2026-05-01", "month")).toBe("May 2026");
    expect(formatBirthDate("2026-01-01", "year")).toBe("2026");
  });
  it("returns null for missing or malformed dates", () => {
    expect(formatBirthDate(null, "day")).toBeNull();
    expect(formatBirthDate("not a date", "day")).toBeNull();
  });
});

describe("birthLine", () => {
  it("uses species terminology", () => {
    expect(birthLine("horse", "2026-01-01", "year")).toBe("Foaled 2026");
    expect(birthLine("cattle", "2026-03-10", "day")).toBe("Calved March 10, 2026");
    expect(birthLine("cattle", null, "day")).toBeNull();
  });
});
