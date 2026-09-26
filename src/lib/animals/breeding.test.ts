import { describe, expect, it } from "vitest";
import { breedingDisplay, formatMoney, type BreedingRow } from "./breeding";

const empty: BreedingRow = {
  status: "available",
  stud_fee_cents: null,
  booking_fee_cents: null,
  collection_fee_cents: null,
  currency: "USD",
  breeding_season: null,
  service_types: [],
  service_type_other: null,
  shipping_info: null,
  female_requirements: null,
  live_offspring_guarantee: null,
  live_offspring_guarantee_terms: null,
  contract_url: null,
  additional_terms: null,
  cta_label: null,
  cta_url: null,
};
const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe("breedingDisplay", () => {
  it("shows nothing unless the animal is marked available for breeding", () => {
    expect(breedingDisplay("horse", false, { ...empty, stud_fee_cents: 150000 })).toBeNull();
  });

  it("with no details: badge and button only, no empty section", () => {
    const d = breedingDisplay("horse", true, null)!;
    expect(d.badge).toBe("Standing at Stud");
    expect(d.facts).toEqual([]);
    expect(d.sections).toEqual([]);
    expect(d.hasDetails).toBe(false);
    expect(d.cta).toEqual({ label: "Ask about breeding", href: null });
  });

  it("lists only populated details, in a sensible order", () => {
    const d = breedingDisplay("horse", true, {
      ...empty,
      stud_fee_cents: 150000,
      collection_fee_cents: 32550,
      breeding_season: "  February – July ",
      service_types: ["cooled", "frozen", "other"],
      service_type_other: "Embryo transfer",
      live_offspring_guarantee: true,
      live_offspring_guarantee_terms: "Rebreed the following season.",
      shipping_info: doc("Ships Monday–Thursday."),
      female_requirements: { type: "doc", content: [{ type: "paragraph" }] },
      cta_url: "https://example.com/book",
    })!;
    expect(d.facts).toEqual([
      { label: "Stud fee", value: "$1,500" },
      { label: "Collection fee", value: "$325.50" },
      { label: "Breeding season", value: "February – July" },
      { label: "Available as", value: "Cooled semen, Frozen semen, Embryo transfer" },
      { label: "Live foal guarantee", value: "Yes. Rebreed the following season." },
    ]);
    expect(d.sections.map((s) => s.heading)).toEqual(["Shipping"]);
    expect(d.cta?.href).toBe("https://example.com/book");
    expect(d.hasDetails).toBe(true);
  });

  it("uses cattle wording for AI sires", () => {
    const d = breedingDisplay("cattle", true, {
      ...empty,
      service_types: ["frozen"],
      live_offspring_guarantee: false,
      female_requirements: doc("x"),
    })!;
    expect(d.badge).toBe("Available for Breeding");
    expect(d.facts).toContainEqual({ label: "Live calf guarantee", value: "No" });
    expect(d.sections[0].heading).toBe("Cow requirements");
  });

  it("private treaty shows the fee as private treaty unless a fee is entered", () => {
    expect(breedingDisplay("horse", true, { ...empty, status: "private_treaty" })!.facts).toEqual([
      { label: "Stud fee", value: "Private treaty" },
    ]);
  });

  it("retired sires show a quiet badge, no fees or booking", () => {
    const d = breedingDisplay("horse", true, { ...empty, status: "retired", stud_fee_cents: 100000 })!;
    expect(d.badge).toBe("Retired from Breeding");
    expect(d.facts).toEqual([]);
    expect(d.cta).toBeNull();
  });

  it("prefers an uploaded contract over a link", () => {
    const d = breedingDisplay(
      "horse",
      true,
      { ...empty, contract_url: "https://example.com/c.pdf" },
      "https://cdn/contract.pdf",
    )!;
    expect(d.contract).toEqual({ href: "https://cdn/contract.pdf", label: "Breeding contract" });
  });
});

describe("formatMoney", () => {
  it("drops cents for whole amounts", () => {
    expect(formatMoney(250000)).toBe("$2,500");
    expect(formatMoney(12345)).toBe("$123.45");
  });
});
