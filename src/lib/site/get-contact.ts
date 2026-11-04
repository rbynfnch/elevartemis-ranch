import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";
import { parseContact, type ContactContent } from "./contact";
import { photoFromMedia, type PageBanner } from "./get-banner";

export type ContactPageData = { content: ContactContent; photo: PageBanner["photo"] };

/** The Contact page's content with its photo resolved, ready to show. */
export async function getContactPage(ranchId: string, slug: string): Promise<ContactPageData> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.pages(slug));

  const db = createPublicClient();
  const { data } = await db.from("pages").select("sections").eq("ranch_id", ranchId).eq("key", "contact").maybeSingle();
  const content = parseContact(data?.sections);
  let photo: ContactPageData["photo"] = null;
  if (content.mediaId) {
    const { data: media } = await db
      .from("media")
      .select("variants, alt_text, focal_x, focal_y, status")
      .eq("ranch_id", ranchId)
      .eq("id", content.mediaId)
      .maybeSingle();
    photo = photoFromMedia(media);
  }
  return { content, photo };
}
