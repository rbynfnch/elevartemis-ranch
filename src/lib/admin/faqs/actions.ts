"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as faqs from "./service";

const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

const item = z.object({
  id: z.uuid().nullable(),
  question: z.string().max(1000),
  answer: z.unknown(),
  group: z.string().max(300),
  isPublished: z.boolean(),
});

export async function saveFaqsAction(raw: unknown) {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  if (!slug || !ctx) return noAccess;
  const parsed = z.array(item).max(100).safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: "Check the questions and try again." };
  const result = await faqs.saveFaqs(await createServerSupabase(), ctx.ranch.id, parsed.data);
  if (result.ok) {
    updateTag(cacheTags.faqs(slug));
    updateTag(cacheTags.site(slug));
  }
  return result;
}
