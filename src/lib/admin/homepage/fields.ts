/** Rules for the homepage slides as typed into the editor. Pure, so they are easy to test. */
export const MAX_SLIDES = 3;

export const slidePages = [
  { value: "home", label: "Home" },
  { value: "about", label: "About" },
  { value: "horses", label: "Horses" },
  { value: "cattle", label: "Cattle" },
  { value: "for_sale", label: "For Sale" },
  { value: "updates", label: "Happening on the Ranch" },
  { value: "contact", label: "Contact" },
] as const;

export type SlideInput = {
  /** Present for a slide that is already saved. */
  id: string | null;
  mediaId: string | null;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaKind: "none" | "page" | "category" | "animal" | "external";
  ctaPage: string;
  ctaCategoryId: string | null;
  ctaAnimalId: string | null;
  ctaUrl: string;
  isActive: boolean;
};

const squash = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);

export type TidySlide = {
  media_id: string | null;
  headline: string;
  subheadline: string | null;
  cta_label: string | null;
  cta_kind: SlideInput["ctaKind"];
  cta_page: string | null;
  cta_category_id: string | null;
  cta_animal_id: string | null;
  cta_url: string | null;
  is_active: boolean;
};

export function tidySlides(slides: SlideInput[]): { ok: true; slides: TidySlide[] } | { ok: false; message: string } {
  if (slides.length > MAX_SLIDES) return { ok: false, message: `The homepage can show up to ${MAX_SLIDES} slides.` };
  const out: TidySlide[] = [];
  for (const [i, s] of slides.entries()) {
    const n = i + 1;
    const headline = squash(s.headline, 120);
    if (!headline) return { ok: false, message: `Slide ${n} needs a headline.` };
    const label = squash(s.ctaLabel, 40);
    if (s.ctaKind !== "none" && !label)
      return { ok: false, message: `Slide ${n}: give the button some words, or set it to no button.` };
    if (s.ctaKind === "page" && !slidePages.some((p) => p.value === s.ctaPage))
      return { ok: false, message: `Slide ${n}: choose a page for the button.` };
    if (s.ctaKind === "category" && !s.ctaCategoryId)
      return { ok: false, message: `Slide ${n}: choose a category for the button.` };
    if (s.ctaKind === "animal" && !s.ctaAnimalId)
      return { ok: false, message: `Slide ${n}: choose an animal for the button.` };
    let url: string | null = null;
    if (s.ctaKind === "external") {
      url = s.ctaUrl.trim();
      if (!/^https:\/\/[^\s]+$/i.test(url) || url.length > 500)
        return { ok: false, message: `Slide ${n}: the button's address must start with https://` };
    }
    out.push({
      media_id: s.mediaId,
      headline,
      subheadline: squash(s.subheadline, 240) || null,
      cta_label: s.ctaKind === "none" ? null : label,
      cta_kind: s.ctaKind,
      cta_page: s.ctaKind === "page" ? s.ctaPage : null,
      cta_category_id: s.ctaKind === "category" ? s.ctaCategoryId : null,
      cta_animal_id: s.ctaKind === "animal" ? s.ctaAnimalId : null,
      cta_url: url,
      is_active: s.isActive,
    });
  }
  if (out.length > 0 && !out.some((s) => s.is_active))
    return { ok: false, message: "Turn at least one slide on, or remove them all." };
  return { ok: true, slides: out };
}
