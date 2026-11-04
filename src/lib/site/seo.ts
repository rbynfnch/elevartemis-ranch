import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { photoFromMedia } from "./get-banner";
import type { SiteSettings } from "./get-site";

export type PageSeo = {
  metaTitle: string | null;
  metaDescription: string | null;
  focusPhrase: string | null;
  ogImage: string | null;
};

/** What the owner wrote for search engines on one page (Search Engines in the admin), or null when nothing. */
export async function getPageSeo(ranchId: string, slug: string, pageKey: string): Promise<PageSeo | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.pages(slug));
  const db = createPublicClient();
  const { data, error } = await db
    .from("page_seo")
    .select("meta_title, meta_description, focus_phrase, og_media_id")
    .eq("ranch_id", ranchId)
    .eq("page_key", pageKey)
    .maybeSingle();
  // Before the search-engine update is applied there is simply nothing.
  if (error || !data) return null;
  let ogImage: string | null = null;
  if (data.og_media_id) {
    const { data: media } = await db
      .from("media")
      .select("variants, alt_text, focal_x, focal_y, status")
      .eq("ranch_id", ranchId)
      .eq("id", data.og_media_id)
      .maybeSingle();
    ogImage = photoFromMedia(media)?.src ?? null;
  }
  return {
    metaTitle: data.meta_title,
    metaDescription: data.meta_description,
    focusPhrase: data.focus_phrase,
    ogImage,
  };
}

/**
 * The page's title, description, canonical address and share card: the owner's text where they wrote some,
 * the given defaults where they didn't. Home uses the title as it is; other pages get the ranch name added.
 */
export async function pageMetadata(
  site: SiteSettings,
  pageKey: string,
  defaults: { title: string; description?: string | null; path: string },
): Promise<Metadata> {
  const seo = await getPageSeo(site.ranchId, site.slug, pageKey);
  const description = seo?.metaDescription ?? defaults.description ?? site.profile.tagline ?? undefined;
  const title = seo?.metaTitle ?? defaults.title;
  return {
    title: pageKey === "home" && seo?.metaTitle ? { absolute: seo.metaTitle } : title,
    description,
    alternates: { canonical: defaults.path },
    openGraph: {
      title: seo?.metaTitle ?? (pageKey === "home" ? site.name : `${defaults.title} | ${site.name}`),
      description,
      siteName: site.name,
      type: "website",
      images: seo?.ogImage ? [{ url: seo.ogImage }] : undefined,
    },
  };
}
