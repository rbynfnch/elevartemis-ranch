import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { parseAbout, type AboutContent } from "./about";
import { photoFromMedia, type PageBanner } from "./get-banner";

export type AboutPageData = { content: AboutContent; photos: Record<string, PageBanner["photo"]> };

/** The About page's content with each chosen photo resolved, ready to show. */
export async function getAboutPage(ranchId: string, slug: string): Promise<AboutPageData> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.pages(slug));

  const db = createPublicClient();
  const { data } = await db.from("pages").select("sections").eq("ranch_id", ranchId).eq("key", "about").maybeSingle();
  const content = parseAbout(data?.sections);
  const ids = [content.intro.mediaId, content.story.mediaId, content.bandMediaId].filter((id): id is string =>
    Boolean(id),
  );
  const photos: AboutPageData["photos"] = {};
  if (ids.length) {
    const { data: media } = await db
      .from("media")
      .select("id, variants, alt_text, focal_x, focal_y, status")
      .eq("ranch_id", ranchId)
      .in("id", ids);
    for (const m of media ?? []) photos[m.id] = photoFromMedia(m);
  }
  return { content, photos };
}
