import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { mediaUrl, parseVariants, pickVariant, srcSet } from "@/lib/media/variants";
import type { Species } from "@/lib/domain/species";
import type { BreedingRow } from "@/lib/animals/breeding";
import type { PerformanceInput, SaleInput } from "@/lib/animals/portfolio";

export type GalleryPhoto = {
  id: string;
  /** Main-size image and its responsive set. */
  src: string;
  srcSet: string;
  /** Small square-ish preview for the thumbnail strip. */
  thumb: string;
  /** Largest size, for the full-screen view. */
  large: string;
  alt: string | null;
  focalX: number;
  focalY: number;
};

export type AnimalPage = {
  id: string;
  name: string;
  registeredName: string | null;
  slug: string;
  species: Species;
  categoryId: string | null;
  sex: string;
  breed: string | null;
  color: string | null;
  height: string | null;
  earTag: string | null;
  weightLb: number | null;
  headCount: number | null;
  registry: string | null;
  registrationNumber: string | null;
  birthDate: string | null;
  birthPrecision: "year" | "month" | "day";
  programStatus: "active" | "retired" | "reference" | "deceased";
  deceasedOn: string | null;
  deceasedPrecision: "year" | "month" | "day";
  breedingAvailable: boolean;
  description: unknown;
  tagline: string | null;
  highlights: string[];
  videoUrl: string | null;
  ownerFacts: { label: string; value: string }[];
  sections: { heading: string; body: unknown }[];
  sale: SaleInput;
  breeding: BreedingRow | null;
  performance: PerformanceInput;
  photos: GalleryPhoto[];
};

export type AnimalLookup =
  { kind: "found"; animal: AnimalPage } | { kind: "moved"; slug: string } | { kind: "missing" };

const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/**
 * One animal's public page, by ranch, species and web address. Row-Level
 * Security decides what a visitor may see (published, not deleted, ranch not
 * suspended), so a hidden animal simply isn't found. A renamed animal's old
 * address answers "moved" so the page can redirect.
 */
export async function getAnimalPage(
  ranchId: string,
  ranchSlug: string,
  species: Species,
  slug: string,
): Promise<AnimalLookup> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(ranchSlug), cacheTags.animals(ranchSlug));

  const db = createPublicClient();
  const { data: a, error } = await db
    .from("animals")
    .select("*")
    .eq("ranch_id", ranchId)
    .eq("species", species)
    .eq("slug", slug)
    .eq("record_scope", "inventory")
    .maybeSingle();
  if (error) throw new Error(`Loading the animal failed: ${error.message}`);

  if (!a) {
    const { data: moved, error: movedError } = await db.rpc("resolve_animal_slug", { p_ranch: ranchId, p_slug: slug });
    if (movedError) throw new Error(`Checking the old address failed: ${movedError.message}`);
    const row = moved?.[0];
    return row?.is_redirect && row.slug !== slug ? { kind: "moved", slug: row.slug } : { kind: "missing" };
  }

  const [facts, sections, sale, breeding, performance, photoLinks, videos] = await Promise.all([
    db.from("animal_facts").select("label, value").eq("animal_id", a.id).order("sort_order"),
    db.from("animal_sections").select("heading, body").eq("animal_id", a.id).order("sort_order"),
    db.from("sale_listings").select("*").eq("animal_id", a.id).maybeSingle(),
    db.from("breeding_services").select("*").eq("animal_id", a.id).maybeSingle(),
    db.from("cattle_performance").select("*").eq("animal_id", a.id).maybeSingle(),
    db
      .from("animal_media")
      .select("sort_order, media ( id, variants, alt_text, focal_x, focal_y, status )")
      .eq("animal_id", a.id)
      .order("sort_order"),
    db.from("animal_videos").select("url").eq("animal_id", a.id).order("sort_order").limit(1),
  ]);
  for (const r of [facts, sections, sale, breeding, performance, photoLinks, videos]) {
    if (r.error) throw new Error(`Loading the animal page failed: ${r.error.message}`);
  }

  const photos: GalleryPhoto[] = [];
  for (const link of photoLinks.data ?? []) {
    const m = one(link.media);
    if (!m || m.status !== "ready" || parseVariants(m.variants).length === 0) continue;
    const main = pickVariant(m.variants, 960)!;
    const thumb = pickVariant(m.variants, 320)!;
    const large = pickVariant(m.variants, 1600)!;
    photos.push({
      id: m.id,
      src: mediaUrl(main.path),
      srcSet: srcSet(m.variants),
      thumb: mediaUrl(thumb.path),
      large: mediaUrl(large.path),
      alt: m.alt_text,
      focalX: Number(m.focal_x),
      focalY: Number(m.focal_y),
    });
  }
  // The owner's main photo leads the gallery.
  const main = photos.findIndex((p) => p.id === a.primary_media_id);
  if (main > 0) photos.unshift(...photos.splice(main, 1));

  return {
    kind: "found",
    animal: {
      id: a.id,
      name: a.name,
      registeredName: a.registered_name,
      slug: a.slug,
      species: a.species,
      categoryId: a.category_id,
      sex: a.sex,
      breed: a.breed,
      color: a.color,
      height: a.height ?? null,
      earTag: a.ear_tag ?? null,
      weightLb: a.weight_lb ?? null,
      headCount: a.head_count ?? null,
      registry: a.registry,
      registrationNumber: a.registration_number,
      birthDate: a.birth_date,
      birthPrecision: a.birth_precision,
      programStatus: a.program_status,
      deceasedOn: a.deceased_on,
      deceasedPrecision: a.deceased_precision,
      breedingAvailable: a.breeding_available,
      description: a.description,
      tagline: a.tagline ?? null,
      highlights: a.highlights ?? [],
      videoUrl: videos.data?.[0]?.url ?? null,
      ownerFacts: facts.data ?? [],
      sections: sections.data ?? [],
      sale: sale.data,
      breeding: breeding.data,
      performance: performance.data,
      photos,
    },
  };
}
