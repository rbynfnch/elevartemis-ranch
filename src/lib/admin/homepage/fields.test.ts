import { describe, expect, it } from "vitest";
import { tidySlides, type SlideInput } from "./fields";

const slide = (over: Partial<SlideInput> = {}): SlideInput => ({
  id: null,
  mediaId: null,
  headline: "  Welcome   home ",
  subheadline: "",
  ctaLabel: "",
  ctaKind: "none",
  ctaPage: "",
  ctaCategoryId: null,
  ctaAnimalId: null,
  ctaUrl: "",
  isActive: true,
  ...over,
});

describe("tidySlides", () => {
  it("tidies a plain slide", () => {
    const r = tidySlides([slide()]);
    expect(r.ok && r.slides[0]).toMatchObject({
      headline: "Welcome home",
      subheadline: null,
      cta_label: null,
      cta_kind: "none",
    });
  });
  it("needs a headline, and words for a button", () => {
    expect(tidySlides([slide({ headline: " " })]).ok).toBe(false);
    expect(tidySlides([slide({ ctaKind: "page", ctaPage: "about", ctaLabel: "" })]).ok).toBe(false);
  });
  it("checks each kind of button destination", () => {
    const ok = (over: Partial<SlideInput>) => tidySlides([slide({ ctaLabel: "Go", ...over })]).ok;
    expect(ok({ ctaKind: "page", ctaPage: "for_sale" })).toBe(true);
    expect(ok({ ctaKind: "page", ctaPage: "nowhere" })).toBe(false);
    expect(ok({ ctaKind: "category" })).toBe(false);
    expect(ok({ ctaKind: "category", ctaCategoryId: "cattle.bull" })).toBe(true);
    expect(ok({ ctaKind: "animal" })).toBe(false);
    expect(ok({ ctaKind: "external", ctaUrl: "http://example.com" })).toBe(false);
    expect(ok({ ctaKind: "external", ctaUrl: "https://example.com/x" })).toBe(true);
  });
  it("allows three slides at most and needs one switched on", () => {
    expect(tidySlides([slide(), slide(), slide(), slide()]).ok).toBe(false);
    expect(tidySlides([slide({ isActive: false })]).ok).toBe(false);
    expect(tidySlides([]).ok).toBe(true);
  });
});
