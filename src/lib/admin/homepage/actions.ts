"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as homepage from "./service";

const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

const slide = z.object({
  id: z.uuid().nullable(),
  mediaId: z.uuid().nullable(),
  headline: z.string().max(600),
  subheadline: z.string().max(1200),
  ctaLabel: z.string().max(200),
  ctaKind: z.enum(["none", "page", "category", "animal", "external"]),
  ctaPage: z.string().max(40),
  ctaCategoryId: z.string().max(60).nullable(),
  ctaAnimalId: z.uuid().nullable(),
  ctaUrl: z.string().max(600),
  isActive: z.boolean(),
});

export async function saveSlidesAction(raw: unknown) {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  if (!slug || !ctx) return noAccess;
  const parsed = z.array(slide).max(3).safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: "Check the slides and try again." };
  const result = await homepage.saveSlides(await createServerSupabase(), ctx.ranch.id, parsed.data);
  if (result.ok) {
    updateTag(cacheTags.slides(slug));
    updateTag(cacheTags.site(slug));
  }
  return result;
}
