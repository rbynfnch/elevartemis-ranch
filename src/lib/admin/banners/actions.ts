"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as banners from "./service";

const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

async function context() {
  const slug = await currentRanchSlug();
  if (!slug) return null;
  const ctx = await requireAdmin(slug);
  if (!ctx) return null;
  return { slug, ranchId: ctx.ranch.id, db: await createServerSupabase() };
}

const input = z.object({
  headline: z.string().max(400),
  subheadline: z.string().max(800),
  mediaId: z.uuid().nullable(),
});

export async function saveBannerAction(key: string, raw: unknown) {
  const c = await context();
  if (!c) return noAccess;
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: "Check the banner details and try again." };
  const result = await banners.saveBanner(c.db, c.ranchId, key, parsed.data);
  if (result.ok) {
    updateTag(cacheTags.pages(c.slug));
    updateTag(cacheTags.site(c.slug));
  }
  return result;
}
