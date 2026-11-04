"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as seo from "./service";

const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

const input = z.object({
  metaTitle: z.string().max(400),
  metaDescription: z.string().max(800),
  focusPhrase: z.string().max(400),
  ogMediaId: z.uuid().nullable(),
});

export async function saveSeoAction(key: string, raw: unknown) {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  if (!slug || !ctx) return noAccess;
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: "Check the details and try again." };
  const result = await seo.saveSeo(await createServerSupabase(), ctx.ranch.id, key, parsed.data);
  if (result.ok) {
    updateTag(cacheTags.pages(slug));
    updateTag(cacheTags.site(slug));
  }
  return result;
}
