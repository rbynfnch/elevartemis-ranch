"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import { saveBrand } from "./service";

const input = z.object({
  wordmark: z.string().max(300),
  subtitle: z.string().max(300),
  mark: z.string().max(40),
  presetId: z.string().max(40),
  font: z.string().max(40),
});

export async function saveBrandAction(raw: unknown) {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  if (!slug || !ctx)
    return { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false as const, message: "Check the details and try again." };
  const result = await saveBrand(ctx.ranch.id, ctx.ranch.name, parsed.data, ctx.ranch.role === "owner");
  if (result.ok) {
    updateTag(cacheTags.ranch(slug));
    updateTag(cacheTags.site(slug));
  }
  return result;
}
