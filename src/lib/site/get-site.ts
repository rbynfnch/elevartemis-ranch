import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import {
  parsePaletteOverride,
  resolveFontPreset,
  resolvePalette,
  type FontPreset,
  type Palette,
} from "@/lib/brand/tokens";
import type { Species } from "@/lib/domain/species";
import type { Database } from "@/lib/database.types";

type SocialPlatform = Database["public"]["Enums"]["social_platform"];

export type SiteSettings = {
  ranchId: string;
  slug: string;
  name: string;
  status: "draft" | "live" | "suspended";
  enabledSpecies: Species[];
  primaryHostname: string | null;
  brand: {
    wordmark: string;
    subtitle: string | null;
    mark: string | null;
    palette: Palette;
    fontPreset: FontPreset;
  };
  profile: {
    tagline: string | null;
    intro: unknown;
    publicPhone: string | null;
    city: string | null;
    region: string | null;
  };
  seo: {
    titleTemplate: string;
    description: string | null;
    noindex: boolean;
    ga4Id: string | null;
    gscVerification: string | null;
  };
  social: { platform: SocialPlatform; url: string; label: string | null }[];
  /** bucket → count, per species. Buckets with no animals are absent. */
  navCounts: Record<Species, Record<string, number>>;
  categories: CategoryRow[];
  contentCounts: { posts: number; faqs: number; gallery: number };
};

export type CategoryRow = {
  id: string;
  species: Species;
  key: string;
  label_singular: string;
  label_plural: string;
  path_segment: string;
  groups_by_birth_year: boolean;
  sort_order: number;
};

/**
 * Everything the public site chrome needs for one ranch.
 * Cached; expired by admin saves via cacheTags.site / cacheTags.ranch.
 */
export async function getSiteSettings(slug: string): Promise<SiteSettings | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.site(slug), cacheTags.animals(slug));

  const db = createPublicClient();
  const { data: ranch, error } = await db
    .from("ranches")
    .select(
      `id, slug, name, status, enabled_species,
       ranch_domains ( hostname, is_primary ),
       ranch_branding ( wordmark_text, wordmark_subtitle, brand_mark, palette, font_preset ),
       ranch_profile ( tagline, intro, public_phone, city, region ),
       ranch_seo ( title_template, default_description, noindex, ga4_id, gsc_verification ),
       social_links ( platform, url, label, sort_order )`,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Loading site settings failed: ${error.message}`);
  if (!ranch) return null;

  const { data: counts, error: countError } = await db.rpc("public_nav_counts", { p_ranch: ranch.id });
  if (countError) throw new Error(`Loading navigation failed: ${countError.message}`);

  const [categories, posts, faqs, gallery] = await Promise.all([
    db
      .from("animal_categories")
      .select("id, species, key, label_singular, label_plural, path_segment, groups_by_birth_year, sort_order")
      .order("sort_order"),
    db
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("ranch_id", ranch.id)
      .eq("status", "published")
      .is("archived_at", null),
    db.from("faqs").select("id", { count: "exact", head: true }).eq("ranch_id", ranch.id).eq("is_published", true),
    db
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("ranch_id", ranch.id)
      .eq("in_gallery", true)
      .eq("status", "ready"),
  ]);
  for (const r of [categories, posts, faqs, gallery]) {
    if (r.error) throw new Error(`Loading site settings failed: ${r.error.message}`);
  }

  const navCounts: SiteSettings["navCounts"] = { horse: {}, cattle: {} };
  for (const row of counts ?? []) navCounts[row.species][row.bucket] = row.total;

  const branding = ranch.ranch_branding;
  const profile = ranch.ranch_profile;
  const seo = ranch.ranch_seo;

  return {
    ranchId: ranch.id,
    slug: ranch.slug,
    name: ranch.name,
    status: ranch.status,
    enabledSpecies: ranch.enabled_species,
    primaryHostname: ranch.ranch_domains.find((d) => d.is_primary)?.hostname ?? null,
    brand: {
      wordmark: branding?.wordmark_text?.trim() || ranch.name,
      subtitle: branding?.wordmark_subtitle?.trim() || null,
      mark: branding?.brand_mark?.trim() || null,
      palette: resolvePalette(parsePaletteOverride(branding?.palette)),
      fontPreset: resolveFontPreset(branding?.font_preset),
    },
    profile: {
      tagline: profile?.tagline ?? null,
      intro: profile?.intro ?? null,
      publicPhone: profile?.public_phone ?? null,
      city: profile?.city ?? null,
      region: profile?.region ?? null,
    },
    seo: {
      titleTemplate: seo?.title_template ?? "%s | {ranch}",
      description: seo?.default_description ?? null,
      noindex: seo?.noindex ?? true,
      ga4Id: seo?.ga4_id ?? null,
      gscVerification: seo?.gsc_verification ?? null,
    },
    social: [...ranch.social_links]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ platform, url, label }) => ({ platform, url, label })),
    navCounts,
    categories: categories.data ?? [],
    contentCounts: { posts: posts.count ?? 0, faqs: faqs.count ?? 0, gallery: gallery.count ?? 0 },
  };
}
