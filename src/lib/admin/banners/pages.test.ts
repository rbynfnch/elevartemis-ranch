import { describe, expect, it } from "vitest";
import { bannerPages, categoryBannerKey, isBannerKey, tidyBanner } from "./pages";

describe("banner keys", () => {
  it("accepts the main pages and category pages only", () => {
    for (const k of [
      "about",
      "horses",
      "cattle",
      "for-sale",
      "sold-horses",
      "sold-cattle",
      "retired-cattle",
      "reference-horses",
      "in-memory",
      "on-the-ranch",
      "breeding",
      "contact",
      categoryBannerKey("cattle.bull"),
    ])
      expect(isBannerKey(k)).toBe(true);
    for (const k of ["checkout", "category:goat.x", "category:cattle.", "ABOUT"]) expect(isBannerKey(k)).toBe(false);
  });
});

describe("tidyBanner", () => {
  it("collapses spaces and turns blanks into null", () => {
    expect(tidyBanner({ headline: "  Our   Ranch ", subheadline: "   ", mediaId: null })).toEqual({
      headline: "Our Ranch",
      subheadline: null,
      mediaId: null,
    });
  });
  it("cuts over-long text", () => {
    expect(tidyBanner({ headline: "x".repeat(200), subheadline: "", mediaId: "m" }).headline).toHaveLength(120);
  });
});

describe("bannerPages", () => {
  it("offers a species' pages only when the ranch has it, and every offered key can be saved", () => {
    const cattleOnly = bannerPages(["cattle"]).map((p) => p.key);
    expect(cattleOnly).toContain("sold-cattle");
    expect(cattleOnly).not.toContain("horses");
    expect(cattleOnly).not.toContain("sold-horses");
    for (const p of bannerPages(["horse", "cattle"])) expect(isBannerKey(p.key)).toBe(true);
  });
});
