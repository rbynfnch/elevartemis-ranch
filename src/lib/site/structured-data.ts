/**
 * Structured data (JSON-LD) built from the ranch's own records, for search and answer engines.
 * Only what the ranch has recorded appears; nothing is filled in.
 */
import type { SiteSettings } from "./get-site";

type Obj = Record<string, unknown>;

const drop = (o: Obj): Obj =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));

/** The ranch as a business: name, place, phone, links. Shown on every page. */
export function ranchJsonLd(site: SiteSettings, origin: string | null): Obj[] {
  const place = drop({
    "@type": "PostalAddress",
    addressLocality: site.profile.city,
    addressRegion: site.profile.region,
  });
  const hasPlace = Object.keys(place).length > 1;
  const sameAs = site.social.map((s) => s.url);
  return [
    drop({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": origin ? `${origin}/#ranch` : undefined,
      name: site.name,
      url: origin ?? undefined,
      description: site.profile.tagline,
      telephone: site.profile.publicPhone,
      address: hasPlace ? place : undefined,
      sameAs: sameAs.length ? sameAs : undefined,
    }),
    drop({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      url: origin ?? undefined,
    }),
  ];
}

/** Home > Section > Page, for the pages that sit under a section. */
export function breadcrumbJsonLd(origin: string | null, trail: { name: string; path: string }[]): Obj {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: origin ? `${origin}${t.path}` : t.path,
    })),
  };
}

/** A list page (an animal's listing, the blog) as a list of its items. */
export function itemListJsonLd(origin: string | null, items: { name: string; path: string }[]): Obj {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: origin ? `${origin}${it.path}` : it.path,
    })),
  };
}

/** One animal for sale as an offer: only the facts the ranch has recorded. */
export function animalOfferJsonLd(
  origin: string | null,
  a: {
    name: string;
    path: string;
    description: string | null;
    image: string | null;
    breed: string | null;
    priceCents: number | null;
    currency: string | null;
    availability: "available" | "pending" | null;
  },
): Obj {
  const offer =
    a.availability !== null
      ? drop({
          "@type": "Offer",
          url: origin ? `${origin}${a.path}` : a.path,
          price: a.priceCents != null ? (a.priceCents / 100).toFixed(2) : undefined,
          priceCurrency: a.priceCents != null ? (a.currency ?? "USD") : undefined,
          availability:
            a.availability === "available" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
        })
      : undefined;
  return drop({
    "@context": "https://schema.org",
    "@type": "Product",
    name: a.name,
    description: a.description,
    image: a.image,
    category: a.breed,
    url: origin ? `${origin}${a.path}` : a.path,
    offers: offer,
  });
}

/** The visible "Quick answers" for an animal, only from recorded facts, as questions and answers. */
export type QuickAnswer = { question: string; answer: string };

export function quickAnswers(a: {
  name: string;
  forSale: "available" | "pending" | "sold" | null;
  price: string | null;
  birthYear: number | null;
  height: string | null;
  color: string | null;
  breed: string | null;
  registration: string | null;
  sire: string | null;
  dam: string | null;
  ranchName: string;
}): QuickAnswer[] {
  const out: QuickAnswer[] = [];
  if (a.forSale === "available")
    out.push({
      question: `Is ${a.name} for sale?`,
      answer: `Yes. ${a.name} is for sale at ${a.ranchName}.${a.price ? ` Price: ${a.price}.` : ""}`,
    });
  else if (a.forSale === "pending")
    out.push({ question: `Is ${a.name} for sale?`, answer: `A sale of ${a.name} is pending at ${a.ranchName}.` });
  else if (a.forSale === "sold") out.push({ question: `Is ${a.name} for sale?`, answer: `${a.name} has been sold.` });
  if (a.sire || a.dam) {
    const parents = [a.sire ? `sire ${a.sire}` : null, a.dam ? `dam ${a.dam}` : null].filter(Boolean).join(" and ");
    out.push({ question: `Who are ${a.name}'s parents?`, answer: `${a.name}'s ${parents}.` });
  }
  if (a.registration) out.push({ question: `What is ${a.name}'s registration?`, answer: `${a.registration}.` });
  if (a.birthYear) out.push({ question: `When was ${a.name} born?`, answer: `${a.name} was born in ${a.birthYear}.` });
  const traits = [a.breed, a.color, a.height ? `${a.height} tall` : null].filter(Boolean).join(", ");
  if (traits) out.push({ question: `What does ${a.name} look like?`, answer: `${a.name} is ${traits}.` });
  return out;
}

export function faqJsonLd(items: QuickAnswer[]): Obj | null {
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}
