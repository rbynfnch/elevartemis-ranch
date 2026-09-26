import { describe, expect, it } from "vitest";
import { parseBasics, parseBreeding, parseDetails, parsePerformance, parseSale, parseStatus } from "./schemas";

const fd = (entries: [string, string][]) => {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
};

describe("parseBasics", () => {
  it("requires only name, species, category and sex", () => {
    const r = parseBasics(
      fd([
        ["species", "horse"],
        ["category_id", "horse.mare"],
        ["name", " Blue Star "],
        ["sex", "female"],
      ]),
    );
    expect(r.ok && r.data).toMatchObject({
      name: "Blue Star",
      breed: null,
      registration_number: null,
      birth_date: null,
      description: null,
    });
  });
  it("reports every missing field at once", () => {
    const r = parseBasics(fd([]));
    expect(!r.ok && Object.keys(r.fieldErrors).sort()).toEqual(["category_id", "name", "sex", "species"]);
  });
  it("takes a birth year alone", () => {
    const r = parseBasics(
      fd([
        ["species", "horse"],
        ["category_id", "horse.foal"],
        ["name", "A"],
        ["sex", "female"],
        ["birth_precision", "year"],
        ["birth_year", "2026"],
      ]),
    );
    expect(r.ok && [r.data.birth_date, r.data.birth_precision]).toEqual(["2026-01-01", "year"]);
  });
});

describe("parseSale", () => {
  it("not for sale removes the listing", () => {
    expect(
      parseSale(
        fd([
          ["sale_status", "none"],
          ["price", "5000"],
        ]),
      ),
    ).toEqual({ ok: true, data: null });
  });
  it("needs a price only when showing one", () => {
    expect(
      parseSale(
        fd([
          ["sale_status", "available"],
          ["price_mode", "price"],
        ]),
      ),
    ).toMatchObject({ ok: false, fieldErrors: { price: expect.any(String) } });
    expect(
      parseSale(
        fd([
          ["sale_status", "available"],
          ["price_mode", "contact"],
        ]),
      ),
    ).toMatchObject({ ok: true, data: { price_cents: null } });
    expect(
      parseSale(
        fd([
          ["sale_status", "available"],
          ["price_mode", "price"],
          ["price", "$8,500"],
        ]),
      ),
    ).toMatchObject({ ok: true, data: { price_cents: 850000 } });
  });
});

describe("parseStatus", () => {
  it("records a date of death only for deceased animals", () => {
    const r = parseStatus(
      fd([
        ["program_status", "deceased"],
        ["deceased_precision", "year"],
        ["deceased_year", "2024"],
        ["is_published", "on"],
      ]),
    );
    expect(r.ok && r.data).toMatchObject({
      program_status: "deceased",
      deceased_on: "2024-01-01",
      is_published: true,
      is_featured: false,
    });
    const active = parseStatus(
      fd([
        ["program_status", "active"],
        ["deceased_year", "2024"],
      ]),
    );
    expect(active.ok && active.data.deceased_on).toBeNull();
  });
});

describe("parseBreeding", () => {
  it("everything optional; blanks are null, 'other' implied by its description", () => {
    const r = parseBreeding(
      fd([
        ["breeding_available", "on"],
        ["stud_fee", "1,500"],
        ["service_types", "cooled"],
        ["service_type_other", "Embryo transfer"],
      ]),
    );
    expect(r.ok && r.data.row).toMatchObject({
      stud_fee_cents: 150000,
      booking_fee_cents: null,
      service_types: ["cooled", "other"],
      service_type_other: "Embryo transfer",
      live_offspring_guarantee: null,
      shipping_info: null,
    });
  });
  it("rejects non-https links", () => {
    expect(parseBreeding(fd([["cta_url", "http://example.com"]]))).toMatchObject({
      ok: false,
      fieldErrors: { cta_url: expect.any(String) },
    });
  });
});

describe("parsePerformance", () => {
  it("an empty form deletes the record", () => {
    expect(
      parsePerformance(
        fd([
          ["birth_weight_lb", ""],
          ["epd_trait", ""],
          ["epd_value", ""],
        ]),
      ),
    ).toEqual({ ok: true, data: null });
  });
  it("catches typos and needs an as-of date for EPDs", () => {
    expect(parsePerformance(fd([["birth_weight_lb", "780"]]))).toMatchObject({
      ok: false,
      fieldErrors: { birth_weight_lb: expect.stringMatching(/20–250/) },
    });
    expect(
      parsePerformance(
        fd([
          ["epd_trait", "BW"],
          ["epd_value", "1.2"],
        ]),
      ),
    ).toMatchObject({ ok: false, fieldErrors: { epds_as_of: expect.any(String) } });
    const r = parsePerformance(
      fd([
        ["weaning_weight_adj_lb", "645"],
        ["epd_trait", "WW"],
        ["epd_value", "62"],
        ["epds_as_of", "2026-09-01"],
      ]),
    );
    expect(r.ok && r.data).toMatchObject({
      weaning_weight_adj_lb: 645,
      epds: [{ trait: "WW", value: 62 }],
      epds_as_of: "2026-09-01",
    });
  });
});

describe("parseDetails", () => {
  it("drops empty rows and requires complete ones", () => {
    const ok = parseDetails(
      fd([
        [
          "facts",
          JSON.stringify([
            { label: "Height", value: "15.1 hh" },
            { label: "", value: "" },
          ]),
        ],
        ["sections", "[]"],
      ]),
    );
    expect(ok).toEqual({ ok: true, data: { facts: [{ label: "Height", value: "15.1 hh" }], sections: [] } });
    expect(parseDetails(fd([["facts", JSON.stringify([{ label: "Height", value: "" }])]]))).toMatchObject({
      ok: false,
    });
    expect(parseDetails(fd([["facts", "not json"]]))).toMatchObject({ ok: false });
  });
});
