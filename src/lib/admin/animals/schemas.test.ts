import { describe, expect, it } from "vitest";
import {
  parseAnimalEdit,
  parseBasics,
  parseBreeding,
  parseProfile,
  parseDetails,
  parsePerformance,
  parseSale,
  parseStatus,
} from "./schemas";

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

describe("parseAnimalEdit (one Save for the whole page)", () => {
  const base: [string, string][] = [
    ["species", "horse"],
    ["category_id", "horse.mare"],
    ["name", "Blue Star"],
    ["sex", "female"],
    ["is_published", "on"],
    ["program_status", "active"],
    ["sale_status", "none"],
  ];

  it("reads every section from one form", () => {
    const r = parseAnimalEdit(fd([...base, ["facts", JSON.stringify([{ label: "Height", value: "15.1 hands" }])]]));
    expect(r.ok && r.data.basics.name).toBe("Blue Star");
    expect(r.ok && r.data.status).toMatchObject({ is_published: true, program_status: "active" });
    expect(r.ok && r.data.sale).toBeNull();
    expect(r.ok && r.data.details.facts).toEqual([{ label: "Height", value: "15.1 hands" }]);
  });

  it("skips Breeding and Performance unless the page showed them", () => {
    const r = parseAnimalEdit(fd(base));
    expect(r.ok && "breeding" in r.data).toBe(false);
    expect(r.ok && "performance" in r.data).toBe(false);
    const withBreeding = parseAnimalEdit(fd([...base, ["has_breeding", "1"]]));
    expect(withBreeding.ok && withBreeding.data.breeding?.breeding_available).toBe(false);
  });

  it("reports problems from several sections together and saves nothing", () => {
    const r = parseAnimalEdit(
      fd([
        ["species", "horse"],
        ["category_id", "horse.mare"],
        ["sex", "female"],
        ["sale_status", "available"],
        ["price_mode", "price"],
        ["facts", JSON.stringify([{ label: "Height", value: "" }])],
      ]),
    );
    expect(!r.ok && Object.keys(r.fieldErrors).sort()).toEqual(["facts", "name", "price"]);
  });
});

describe("parseBasics breed", () => {
  const base: [string, string][] = [
    ["species", "cattle"],
    ["category_id", "cattle.bull"],
    ["name", "Copper"],
    ["sex", "male"],
  ];
  it("takes the chosen breed", () => {
    const r = parseBasics(fd([...base, ["breed", "Hereford"]]));
    expect(r.ok && r.data.breed).toBe("Hereford");
  });
  it("takes a new breed typed under 'Add a new breed'", () => {
    const r = parseBasics(fd([...base, ["breed", "__new__"], ["breed_new", "  Red Angus "]]));
    expect(r.ok && r.data.breed).toBe("Red Angus");
  });
  it("asks for the name when 'Add a new breed' is chosen but left empty", () => {
    const r = parseBasics(fd([...base, ["breed", "__new__"], ["breed_new", " "]]));
    expect(!r.ok && r.fieldErrors.breed).toBeTruthy();
  });
  it("leaves the breed empty when none is chosen", () => {
    const r = parseBasics(fd([...base, ["breed", ""]]));
    expect(r.ok && r.data.breed).toBeNull();
  });
});

describe("parseProfile (tagline, highlights, video)", () => {
  it("reads all three, trimming and dropping blank highlights", () => {
    const r = parseProfile(
      fd([
        ["tagline", "  A proven ranch gelding.  "],
        ["highlight", "Ranch Proven"],
        ["highlight", "  "],
        ["highlight", " Trail   Ready "],
        ["video_url", "https://www.tiktok.com/@ranch/video/1"],
      ]),
    );
    expect(r.ok && r.data).toEqual({
      tagline: "A proven ranch gelding.",
      highlights: ["Ranch Proven", "Trail Ready"],
      video_url: "https://www.tiktok.com/@ranch/video/1",
    });
  });
  it("is all optional", () => {
    expect(parseProfile(fd([])).ok).toBe(true);
  });
  it("reports a long tagline, a long or extra highlight, and a link from another site", () => {
    const r = parseProfile(
      fd([
        ["tagline", "x".repeat(161)],
        ["highlight", "y".repeat(31)],
        ["video_url", "https://example.com/video"],
      ]),
    );
    expect(!r.ok && Object.keys(r.fieldErrors).sort()).toEqual(["highlights", "tagline", "video_url"]);
    const tooMany = parseProfile(fd(["a", "b", "c", "d", "e"].map((h) => ["highlight", h] as [string, string])));
    expect(!tooMany.ok && tooMany.fieldErrors.highlights).toContain("up to 4");
  });
});
