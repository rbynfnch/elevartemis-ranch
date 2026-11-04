import { describe, expect, it } from "vitest";
import { canGoLive, launchChecks, type LaunchFacts } from "./checks";

const ready: LaunchFacts = {
  tagline: true,
  phone: true,
  publishedAnimals: 3,
  animalsWithoutPhoto: 0,
  sampleAnimals: 0,
  homepageSlides: 1,
  aboutFilled: true,
  messageEmail: true,
  homeSeoWritten: true,
  publishedPosts: 1,
};

describe("launchChecks", () => {
  it("a finished ranch passes everything", () => {
    const c = launchChecks(ready);
    expect(c.every((x) => x.ok)).toBe(true);
    expect(canGoLive(c)).toBe(true);
  });
  it("blocks going live without a tagline, an animal, or with sample animals left", () => {
    expect(canGoLive(launchChecks({ ...ready, tagline: false }))).toBe(false);
    expect(canGoLive(launchChecks({ ...ready, publishedAnimals: 0 }))).toBe(false);
    expect(canGoLive(launchChecks({ ...ready, sampleAnimals: 2 }))).toBe(false);
  });
  it("only recommends the rest", () => {
    const c = launchChecks({
      ...ready,
      phone: false,
      aboutFilled: false,
      homepageSlides: 0,
      messageEmail: false,
      publishedPosts: 0,
      homeSeoWritten: false,
      animalsWithoutPhoto: 4,
    });
    expect(c.filter((x) => !x.ok && !x.required).length).toBe(7);
    expect(canGoLive(c)).toBe(true);
  });
  it("says how many are left to fix, in plain words", () => {
    const c = launchChecks({ ...ready, sampleAnimals: 1, animalsWithoutPhoto: 2 });
    expect(c.find((x) => x.key === "samples")?.detail).toMatch(/1 sample animal is still/);
    expect(c.find((x) => x.key === "photos")?.detail).toMatch(/2 animals have no photo/);
  });
});
