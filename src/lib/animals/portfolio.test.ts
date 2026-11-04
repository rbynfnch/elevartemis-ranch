import { describe, expect, it } from "vitest";
import {
  formatPartialDate,
  lifespanText,
  performanceDisplay,
  plainSummary,
  profileFacts,
  quickFacts,
  saleDisplay,
} from "./portfolio";

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe("formatPartialDate", () => {
  it("shows only as much of the date as is known", () => {
    expect(formatPartialDate("2019-01-01", "year")).toBe("2019");
    expect(formatPartialDate("2019-05-01", "month")).toBe("May 2019");
    expect(formatPartialDate("2019-05-03", "day")).toBe("May 3, 2019");
  });
  it("returns nothing for a missing date", () => {
    expect(formatPartialDate(null, "day")).toBeNull();
  });
});

describe("quickFacts", () => {
  const base = {
    species: "horse" as const,
    breed: "Quarter Horse",
    color: null,
    sex: "female",
    birthDate: "2021-04-02",
    birthPrecision: "year" as const,
    registry: "AQHA",
    registrationNumber: "5551234",
    ownerFacts: [{ label: "Height", value: "15.1 hands" }],
  };
  it("lists what exists, basics first, then the owner's own facts", () => {
    expect(quickFacts(base)).toEqual([
      { label: "Foaled", value: "2021" },
      { label: "Breed", value: "Quarter Horse" },
      { label: "Sex", value: "Female" },
      { label: "Registration", value: "AQHA #5551234" },
      { label: "Height", value: "15.1 hands" },
    ]);
  });
  it("says 'Calved' for cattle and omits an unknown sex", () => {
    const facts = quickFacts({ ...base, species: "cattle", sex: "unknown", registry: null, registrationNumber: "42" });
    expect(facts.find((f) => f.label === "Calved")?.value).toBe("2021");
    expect(facts.find((f) => f.label === "Sex")).toBeUndefined();
    expect(facts.find((f) => f.label === "Registration")?.value).toBe("42");
  });
  it("lets the owner's wording replace a basic with the same label", () => {
    const facts = quickFacts({ ...base, color: "Bay", ownerFacts: [{ label: "color", value: "Rich bay" }] });
    expect(facts.filter((f) => f.label.toLowerCase() === "color")).toEqual([{ label: "color", value: "Rich bay" }]);
  });
});

describe("saleDisplay", () => {
  const sale = {
    status: "available" as const,
    price_mode: "price" as const,
    price_cents: 850000,
    currency: "USD",
    available_on: null,
    location_text: "Home ranch",
    sales_description: null,
  };
  it("shows the price the owner chose to show", () => {
    expect(saleDisplay(sale)).toMatchObject({ badge: "For Sale", price: "$8,500" });
    expect(saleDisplay({ ...sale, price_mode: "contact" })?.price).toBe("Contact for price");
    expect(saleDisplay({ ...sale, price_basis: "per_head" })?.price).toBe("$8,500 per head");
    expect(saleDisplay({ ...sale, price_basis: "total" })?.price).toBe("$8,500 total");
    expect(saleDisplay({ ...sale, price_basis: "each" })?.price).toBe("$8,500");
    expect(saleDisplay({ ...sale, price_mode: "hidden" })?.price).toBeNull();
  });
  it("labels a pending sale and never shows a price once sold", () => {
    expect(saleDisplay({ ...sale, status: "pending" })?.badge).toBe("Sale Pending");
    expect(saleDisplay({ ...sale, status: "sold" })).toMatchObject({ badge: "Sold", price: null });
  });
  it("returns nothing when there is no listing", () => {
    expect(saleDisplay(null)).toBeNull();
  });
});

describe("performanceDisplay", () => {
  const empty = {
    birth_weight_lb: null,
    weaning_weight_lb: null,
    weaning_weight_adj_lb: null,
    yearling_weight_lb: null,
    yearling_weight_adj_lb: null,
    adg_lb: null,
    adg_note: null,
    epds: [],
    epds_as_of: null,
    epds_source: null,
  };
  it("shows nothing when nothing was entered", () => {
    expect(performanceDisplay(null)).toBeNull();
    expect(performanceDisplay(empty)).toBeNull();
  });
  it("formats weights and EPDs, with signs and the as-of note", () => {
    const result = performanceDisplay({
      ...empty,
      birth_weight_lb: 78,
      adg_lb: 2.456,
      epds: [
        { trait: "CED", value: 8, accuracy: 0.45, percentile: 10 },
        { trait: "BW", value: -0.5 },
      ],
      epds_as_of: "2026-03-01",
      epds_source: "American Hereford Association",
    });
    expect(result?.weights).toEqual([
      { label: "Birth weight", value: "78 lb" },
      { label: "Average daily gain", value: "2.46 lb/day" },
    ]);
    expect(result?.epds[0]).toMatchObject({
      code: "CED",
      label: "Calving Ease Direct",
      value: "+8",
      accuracy: ".45",
      percentile: "10%",
    });
    expect(result?.epds[1]).toMatchObject({ value: "-0.5", accuracy: null, percentile: null });
    expect(result?.epdNote).toBe("As of March 1, 2026 · American Hereford Association");
  });
});

describe("plainSummary", () => {
  it("returns plain text, short enough for a page description", () => {
    expect(plainSummary(doc("Kind and  willing."))).toBe("Kind and willing.");
    const long = plainSummary(doc("word ".repeat(80)), 100);
    expect(long!.length).toBeLessThanOrEqual(100);
    expect(long!.endsWith("…")).toBe(true);
  });
  it("returns nothing for empty content", () => {
    expect(plainSummary(null)).toBeNull();
    expect(plainSummary(doc("   "))).toBeNull();
  });
});

describe("lifespanText", () => {
  it("shows both years, or whichever is known, or nothing", () => {
    expect(lifespanText(2012, "2024-01-01", "year")).toBe("2012 – 2024");
    expect(lifespanText(2012, "2024-03-01", "month")).toBe("2012 – March 2024");
    expect(lifespanText(null, "2024-01-01", "year")).toBe("Passed 2024");
    expect(lifespanText(2012, null, "year")).toBe("Born 2012");
    expect(lifespanText(null, null, "year")).toBeNull();
  });
});

describe("profileFacts", () => {
  const base = {
    species: "horse" as const,
    breed: "American Quarter Horse",
    color: "Sorrel roan",
    sex: "gelding",
    birthDate: "2019-01-01",
    birthPrecision: "year" as const,
    registry: "AQHA",
    registrationNumber: "5957423",
    registeredName: "FW High Country",
    ownerFacts: [
      { label: "Height", value: "15.1 HH" },
      { label: "Discipline", value: "Ranch work" },
    ],
  };
  it("builds the strip in a fixed order from what exists", () => {
    expect(profileFacts(base).strip).toEqual([
      { label: "Birth year", value: "2019" },
      { label: "Sex", value: "Gelding" },
      { label: "Height", value: "15.1 HH" },
      { label: "Color", value: "Sorrel roan" },
      { label: "Registration", value: "AQHA #5957423" },
    ]);
  });
  it("prefers the animal's own height over a Height quick fact", () => {
    const r = profileFacts({ ...base, height: "15.3hh", ownerFacts: [{ label: "Height", value: "15 hands" }] });
    expect(r.strip.find((f) => f.label === "Height")?.value).toBe("15.3hh");
  });
  it("leaves out a missing attribute instead of showing a blank", () => {
    const r = profileFacts({ ...base, ownerFacts: [], color: null, registry: null, registrationNumber: null });
    expect(r.strip.map((f) => f.label)).toEqual(["Birth year", "Sex"]);
  });
  it("puts everything else in the details, not twice", () => {
    expect(profileFacts(base).details).toEqual([
      { label: "Registered name", value: "FW High Country" },
      { label: "Discipline", value: "Ranch work" },
    ]);
  });
  it("shows a precise birth date in the details, and lets the owner's Color win", () => {
    const r = profileFacts({
      ...base,
      birthDate: "2019-05-03",
      birthPrecision: "day",
      ownerFacts: [{ label: "Color", value: "Rich sorrel roan" }],
    });
    expect(r.details[0]).toEqual({ label: "Foaled", value: "May 3, 2019" });
    expect(r.strip.find((f) => f.label === "Color")?.value).toBe("Rich sorrel roan");
    expect(r.details.find((f) => f.label.toLowerCase() === "color")).toBeUndefined();
  });
});
