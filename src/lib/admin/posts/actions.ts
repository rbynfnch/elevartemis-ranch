"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as posts from "./service";

const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

async function context() {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  return ctx ? { slug: slug!, ranchId: ctx.ranch.id, userId: ctx.userId, db: await createServerSupabase() } : null;
}

const expire = (slug: string) => {
  updateTag(cacheTags.posts(slug));
  updateTag(cacheTags.site(slug));
};

/** Starts a new draft and opens it for writing. */
export async function newPostAction() {
  const c = await context();
  if (!c) return;
  const r = await posts.createDraft(c.db, c.ranchId, c.userId);
  if (r.ok) redirect(`/admin/updates/${r.data.id}`);
  redirect("/admin/updates");
}

const input = z.object({
  title: z.string().max(400),
  slug: z.string().max(200),
  excerpt: z.string().max(1000),
  body: z.unknown(),
  featuredMediaId: z.uuid().nullable(),
  categoryId: z.uuid().nullable(),
  status: z.enum(["draft", "published"]),
  publishedOn: z.string().max(10),
  metaTitle: z.string().max(400),
  metaDescription: z.string().max(800),
  focusPhrase: z.string().max(400),
  extraMediaIds: z.array(z.uuid()).max(30),
  animalIds: z.array(z.uuid()).max(30),
});

export async function savePostAction(id: string, raw: unknown) {
  const c = await context();
  const parsed = input.safeParse(raw);
  if (!c || !z.uuid().safeParse(id).success) return noAccess;
  if (!parsed.success) return { ok: false as const, message: "Check the post and try again." };
  const result = await posts.savePost(c.db, c.ranchId, id, parsed.data);
  if (result.ok) expire(c.slug);
  return result;
}

export async function createCategoryAction(name: string) {
  const c = await context();
  if (!c) return noAccess;
  return posts.createCategory(c.db, c.ranchId, name);
}

export async function archivePostAction(id: string) {
  const c = await context();
  if (!c || !z.uuid().safeParse(id).success) return noAccess;
  const result = await posts.archivePost(c.db, c.ranchId, id);
  if (result.ok) expire(c.slug);
  return result;
}
