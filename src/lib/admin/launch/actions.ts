"use server";

import { updateTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import { goLive } from "./service";

export async function goLiveAction() {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  if (!slug || !ctx)
    return { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };
  const result = await goLive(await createServerSupabase(), ctx.ranch.id, ctx.ranch.role === "owner");
  if (result.ok) {
    updateTag(cacheTags.ranch(slug));
    updateTag(cacheTags.site(slug));
  }
  return result;
}
