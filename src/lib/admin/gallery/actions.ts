"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as gallery from "./service";

export async function saveGalleryAction(ids: unknown) {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  if (!slug || !ctx)
    return { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };
  const parsed = z.array(z.uuid()).max(gallery.MAX_GALLERY).safeParse(ids);
  if (!parsed.success) return { ok: false as const, message: "Check the photos and try again." };
  const result = await gallery.saveGallery(await createServerSupabase(), ctx.ranch.id, parsed.data);
  if (result.ok) {
    updateTag(cacheTags.gallery(slug));
    updateTag(cacheTags.site(slug));
  }
  return result;
}
