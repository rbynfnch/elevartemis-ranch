"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import { PLATFORMS } from "./fields";
import * as info from "./service";

const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

const input = z.object({
  tagline: z.string().max(800),
  intro: z.unknown(),
  publicPhone: z.string().max(200),
  city: z.string().max(400),
  region: z.string().max(400),
  addressDisplay: z.string().max(800),
  hoursText: z.string().max(800),
  blogLabel: z.string().max(300),
  social: z
    .array(z.object({ platform: z.enum(PLATFORMS), url: z.string().max(600), label: z.string().max(300) }))
    .max(10),
});

export async function saveRanchInfoAction(raw: unknown) {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  if (!slug || !ctx) return noAccess;
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: "Check the details and try again." };
  const result = await info.saveRanchInfo(await createServerSupabase(), ctx.ranch.id, parsed.data);
  if (result.ok) {
    updateTag(cacheTags.ranch(slug));
    updateTag(cacheTags.site(slug));
    updateTag(cacheTags.pages(slug));
  }
  return result;
}
