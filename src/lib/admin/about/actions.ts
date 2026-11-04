"use server";

import { updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as about from "./service";

const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

export async function saveAboutAction(input: about.AboutSaveInput) {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  if (!slug || !ctx) return noAccess;
  const result = await about.saveAbout(await createServerSupabase(), ctx.ranch.id, input);
  if (result.ok) {
    updateTag(cacheTags.pages(slug));
    updateTag(cacheTags.site(slug));
  }
  return result;
}
