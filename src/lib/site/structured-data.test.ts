import { describe, expect, it } from "vitest";
import type { SiteSettings } from "./get-site";
import { animalOfferJsonLd, breadcrumbJsonLd, faqJsonLd, quickAnswers, ranchJsonLd } from "./structured-data";

const site = {
  name: "Flying W Ranch",
  profile: { tagline: "Raising cattle", publicPhone: null, city: "Boise", region: null, intro: null },
  social: [{ platform: "facebook", url: "https://facebook.com/fw", label: null }],
} as unknown as SiteSettings;

describe("ranchJsonLd", () => {
  it("includes only what is recorded", () => {
    const [biz] = ranchJsonLd(site, "https://fw.example");
    expect(biz).toMatchObject({
      "@type": "LocalBusiness",
      name: "Flying W Ranch",
      url: "https://fw.example",
      description: "Raising cattle",
    });
    expect(biz.telephone).toBeUndefined();
    expect(biz.address).toEqual({ "@type": "PostalAddress", addressLocality: "Boise" });
    expect(biz.sameAs).toEqual(["https://facebook.com/fw"]);
  });
  it("leaves out the address when there is no place", () => {
    const [biz] = ranchJsonLd({ ...site, profile: { ...site.profile, city: null } } as SiteSettings, null);
    expect(biz.address).toBeUndefined();
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the trail", () => {
    const b = breadcrumbJsonLd("https://x", [
      { name: "Home", path: "/" },
      { name: "Cattle", path: "/cattle" },
    ]) as { itemListElement: { position: number; item: string }[] };
    expect(b.itemListElement.map((i) => [i.position, i.item])).toEqual([
      [1, "https://x/"],
      [2, "https://x/cattle"],
    ]);
  });
});

describe("animalOfferJsonLd", () => {
  const a = {
    name: "Big Red",
    path: "/horses/big-red",
    description: null,
    image: null,
    breed: "Quarter Horse",
    priceCents: 850000,
    currency: "USD",
    availability: "available" as const,
  };
  it("offers a priced, available animal", () => {
    const j = animalOfferJsonLd("https://x", a) as { offers: Record<string, unknown> };
    expect(j.offers).toMatchObject({
      price: "8500.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    });
  });
  it("makes no offer for an animal that isn't for sale, and no price when none is shown", () => {
    expect((animalOfferJsonLd(null, { ...a, availability: null }) as { offers?: unknown }).offers).toBeUndefined();
    const j = animalOfferJsonLd(null, { ...a, priceCents: null }) as { offers: Record<string, unknown> };
    expect(j.offers.price).toBeUndefined();
  });
});

describe("quickAnswers", () => {
  const base = {
    name: "Big Red",
    forSale: null,
    price: null,
    birthYear: null,
    height: null,
    color: null,
    breed: null,
    registration: null,
    sire: null,
    dam: null,
    ranchName: "FW",
  };
  it("answers only from recorded facts", () => {
    expect(quickAnswers(base)).toEqual([]);
    const q = quickAnswers({
      ...base,
      forSale: "available",
      price: "$8,500",
      sire: "Doc",
      dam: "Lady",
      registration: "AQHA #1",
      birthYear: 2019,
      breed: "Quarter Horse",
      height: "15.1hh",
    });
    expect(q.map((x) => x.question)).toEqual([
      "Is Big Red for sale?",
      "Who are Big Red's parents?",
      "What is Big Red's registration?",
      "When was Big Red born?",
      "What does Big Red look like?",
    ]);
    expect(q[0].answer).toContain("$8,500");
    expect(q[4].answer).toBe("Big Red is Quarter Horse, 15.1hh tall.");
  });
  it("builds FAQ markup, or nothing", () => {
    expect(faqJsonLd([])).toBeNull();
    expect(faqJsonLd([{ question: "Q?", answer: "A." }])).toMatchObject({ "@type": "FAQPage" });
  });
});
