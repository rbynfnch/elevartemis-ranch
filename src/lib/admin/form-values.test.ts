import { describe, expect, it } from "vitest";
import {
  centsToDollars,
  docToText,
  dollarsToCents,
  optionalNumber,
  optionalText,
  parsePartialDate,
  textToDoc,
} from "./form-values";
import { parseEpdRows } from "@/lib/animals/epd";

describe("text ↔ rich text", () => {
  it("never stores blank text", () => {
    expect(textToDoc("   \n\n  ")).toBeNull();
    expect(optionalText("  ")).toBeNull();
  });
  it("keeps paragraphs and line breaks, and round-trips", () => {
    const text = "Kind and willing.\nStarted on cattle.\n\nSecond paragraph.";
    const doc = textToDoc(text);
    expect(doc?.content).toHaveLength(2);
    expect(docToText(doc)).toBe(text);
  });
});

describe("money", () => {
  it("parses what owners type", () => {
    expect(dollarsToCents("$1,500")).toBe(150000);
    expect(dollarsToCents("325.5")).toBe(32550);
    expect(dollarsToCents("")).toBeNull();
    expect(dollarsToCents("call me")).toBeNaN();
    expect(centsToDollars(150000)).toBe("1500");
    expect(centsToDollars(32550)).toBe("325.50");
  });
});

describe("parsePartialDate", () => {
  it("accepts a year, month, or exact day", () => {
    expect(parsePartialDate({ precision: "year", year: "2026" })).toEqual({ date: "2026-01-01", precision: "year" });
    expect(parsePartialDate({ precision: "month", year: "2026", month: "5" })).toEqual({
      date: "2026-05-01",
      precision: "month",
    });
    expect(parsePartialDate({ precision: "day", year: "2024", month: "2", day: "29" })).toEqual({
      date: "2024-02-29",
      precision: "day",
    });
    expect(parsePartialDate({ precision: "day", year: "", month: "", day: "" })).toEqual({
      date: null,
      precision: "day",
    });
  });
  it("explains mistakes plainly", () => {
    expect(parsePartialDate({ precision: "day", year: "2025", month: "2", day: "29" })).toEqual({
      error: "Enter a valid day for that month.",
    });
    expect(parsePartialDate({ precision: "year", year: "26" })).toEqual({ error: "Enter a four-digit year." });
    expect(parsePartialDate({ precision: "month", year: "2026", month: "" })).toEqual({ error: "Choose a month." });
  });
});

describe("numbers and EPDs", () => {
  it("parses optional numbers", () => {
    expect(optionalNumber("1,240")).toBe(1240);
    expect(optionalNumber("")).toBeNull();
    expect(optionalNumber("heavy")).toBeNaN();
  });
  it("validates EPD rows and drops blank ones", () => {
    expect(
      parseEpdRows([
        { trait: "bw", value: "1.2", accuracy: ".45", percentile: "20%" },
        { trait: "", value: "" },
      ]),
    ).toEqual({
      epds: [{ trait: "BW", value: 1.2, accuracy: 0.45, percentile: 20 }],
    });
    expect(
      parseEpdRows([
        { trait: "BW", value: "1" },
        { trait: "bw", value: "2" },
      ]),
    ).toEqual({ error: "BW is listed twice." });
    expect(parseEpdRows([{ trait: "WW", value: "heavy" }])).toEqual({ error: "Enter a number for WW." });
    expect(parseEpdRows([{ trait: "WW", value: "60", accuracy: "45" }])).toMatchObject({
      error: expect.stringMatching(/between 0 and 1/),
    });
  });
});
