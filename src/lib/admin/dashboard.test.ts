import { describe, expect, it } from "vitest";
import { isOverAYearOld, summarizeDashboard, type DashAnimal } from "./dashboard";

const animal = (over: Partial<DashAnimal>): DashAnimal => ({
  id: over.name ?? "x",
  name: "Animal",
  species: "horse",
  category_id: "horse.mare",
  record_scope: "inventory",
  is_published: true,
  primary_media_id: "m1",
  birth_date: null,
  birth_precision: "day",
  archived_at: null,
  is_demo: false,
  ...over,
});

const base = { sales: [], slides: [], posts: [], faqDemoCount: 0, inquiryEmail: "a@b.co", today: "2026-09-25" };

describe("isOverAYearOld", () => {
  it("compares against the same day last year", () => {
    expect(isOverAYearOld("2025-09-25", "2026-09-25")).toBe(true);
    expect(isOverAYearOld("2025-09-26", "2026-09-25")).toBe(false);
    expect(isOverAYearOld("2025-01-01", "2026-09-25")).toBe(true);
    expect(isOverAYearOld(null, "2026-09-25")).toBe(false);
  });
});

describe("summarizeDashboard", () => {
  it("is calm when everything is in order", () => {
    const s = summarizeDashboard({ ...base, enabledSpecies: ["horse"], animals: [animal({ name: "Belle" })] });
    expect(s.attention).toEqual([]);
    expect(s.stats.find((x) => x.label === "Horses")?.value).toBe(1);
    expect(s.stats.find((x) => x.label === "Cattle")).toBeUndefined();
  });

  it("flags missing inquiry email, missing photos, grown foals and broken slides", () => {
    const s = summarizeDashboard({
      ...base,
      inquiryEmail: null,
      animals: [
        animal({ id: "a", name: "No Photo", primary_media_id: null }),
        animal({
          id: "b",
          name: "Little Juniper",
          category_id: "horse.foal",
          birth_date: "2025-01-01",
          birth_precision: "year",
        }),
        animal({ id: "c", name: "Hidden Mare", is_published: false }),
        animal({ id: "d", name: "Gone", archived_at: "2026-01-01" }),
      ],
      slides: [
        {
          id: "s1",
          headline: "Meet Hidden Mare",
          media_id: null,
          is_active: true,
          archived_at: null,
          cta_kind: "animal",
          cta_animal_id: "c",
          is_demo: false,
        },
        {
          id: "s2",
          headline: "Off",
          media_id: null,
          is_active: false,
          archived_at: null,
          cta_kind: "none",
          cta_animal_id: null,
          is_demo: false,
        },
      ],
    });
    const ids = s.attention.map((a) => a.id);
    expect(ids).toEqual([
      "inquiry-email",
      "no-photo",
      "grown-horse.foal",
      "slide-photo-s1",
      "slide-link-s1",
      "draft-animals",
    ]);
    expect(s.attention.find((a) => a.id === "no-photo")?.message).toBe("1 animal has no photos yet: No Photo.");
    expect(s.attention.find((a) => a.id === "grown-horse.foal")?.message).toMatch(/Little Juniper is over a year old/);
  });

  it("suggests moving yearling cattle on at two years old", () => {
    const s = summarizeDashboard({
      ...base,
      animals: [
        animal({
          id: "y1",
          name: "CCR 401",
          species: "cattle",
          category_id: "cattle.yearling",
          birth_date: "2024-03-01",
        }),
        animal({
          id: "y2",
          name: "CCR 614",
          species: "cattle",
          category_id: "cattle.yearling",
          birth_date: "2025-03-10",
        }),
      ],
    });
    expect(s.attention.find((a) => a.id === "grown-cattle.yearling")?.message).toBe(
      "CCR 401 is over 2 years old. Move it to Bulls or Cows?",
    );
  });

  it("respects the owner's decision to keep a foal as a foal", () => {
    const s = summarizeDashboard({
      ...base,
      animals: [
        animal({
          name: "Kept",
          category_id: "horse.foal",
          birth_date: "2025-01-01",
          category_confirmed_at: "2026-02-01T00:00:00Z",
        }),
      ],
    });
    expect(s.attention).toEqual([]);
  });

  it("counts sample content and sale animals", () => {
    const s = summarizeDashboard({
      ...base,
      animals: [
        animal({ id: "a", name: "A", is_demo: true }),
        animal({ id: "b", name: "B", species: "cattle", category_id: "cattle.cow" }),
      ],
      sales: [{ animal_id: "a", status: "pending" }],
      posts: [{ status: "published", archived_at: null, is_demo: true }],
      faqDemoCount: 2,
    });
    expect(s.attention.find((a) => a.id === "demo")?.message).toMatch(/^4 sample items/);
    expect(s.stats.find((x) => x.label === "For sale")?.value).toBe(1);
    expect(s.stats.find((x) => x.label === "Cattle")?.value).toBe(1);
  });
});
