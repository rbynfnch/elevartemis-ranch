"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cacheTags } from "@/lib/cache/tags";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as blog from "./service";

const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };
const badInput = { ok: false as const, message: "Check the post and try again." };

async function context() {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  return ctx ? { slug: slug!, ranchId: ctx.ranch.id, userId: ctx.userId, db: await createServerSupabase() } : null;
}

/** Public pages are refreshed within seconds of anything that changes what visitors can see. */
const expire = (slug: string) => {
  updateTag(cacheTags.posts(slug));
  updateTag(cacheTags.site(slug));
};

const id = z.uuid();

const input = z.object({
  title: z.string().max(1000),
  slug: z.string().max(500),
  excerpt: z.string().max(3000),
  body: z.unknown(),
  featuredMediaId: z.uuid().nullable(),
  categoryId: z.uuid().nullable(),
  tagIds: z.array(z.uuid()).max(40),
  authorName: z.string().max(300),
  showAuthor: z.boolean(),
  publishedLocal: z.string().max(20),
  metaTitle: z.string().max(500),
  metaDescription: z.string().max(1000),
  ogTitle: z.string().max(500),
  ogDescription: z.string().max(1000),
  ogMediaId: z.uuid().nullable(),
  relatedIds: z.array(z.uuid()).max(20),
  animalIds: z.array(z.uuid()).max(60),
});

export async function newPostAction() {
  const c = await context();
  if (!c) redirect("/admin/updates");
  const r = await blog.createDraft(c.db, c.ranchId, c.userId);
  if (r.ok) {
    expire(c.slug);
    redirect(`/admin/updates/${r.data.id}`);
  }
  redirect("/admin/updates");
}

/** Autosave and "Save draft". Never changes what visitors see. */
export async function saveDraftAction(postId: string, raw: unknown, base: string, reason: "save" | "autosave") {
  const c = await context();
  const parsed = input.safeParse(raw);
  if (!c || !id.safeParse(postId).success) return noAccess;
  if (!parsed.success) return badInput;
  const r = await blog.saveDraft(c.db, c.ranchId, c.userId, postId, parsed.data, String(base), reason);
  if (r.ok) expire(c.slug);
  return r;
}

/** Publish now, schedule, or update a live post with its edits. */
export async function publishAction(postId: string, raw: unknown, base: string) {
  const c = await context();
  const parsed = input.safeParse(raw);
  if (!c || !id.safeParse(postId).success) return noAccess;
  if (!parsed.success) return badInput;
  const r = await blog.publish(c.db, c.ranchId, c.userId, postId, parsed.data, String(base));
  if (r.ok) expire(c.slug);
  return r;
}

type Simple = (db: Awaited<ReturnType<typeof createServerSupabase>>, ranchId: string, id: string) => Promise<
  { ok: true; data: unknown } | { ok: false; message: string }
>;

async function simple(postId: string, run: Simple) {
  const c = await context();
  if (!c || !id.safeParse(postId).success) return noAccess;
  const r = await run(c.db, c.ranchId, postId);
  if (r.ok) expire(c.slug);
  return r;
}

export async function archivePostAction(postId: string) {
  return simple(postId, blog.archivePost);
}
export async function unarchivePostAction(postId: string) {
  return simple(postId, blog.unarchivePost);
}
export async function trashPostAction(postId: string) {
  return simple(postId, blog.trashPost);
}
export async function restorePostAction(postId: string) {
  return simple(postId, blog.restorePost);
}
export async function deletePostForeverAction(postId: string) {
  return simple(postId, blog.deletePostForever);
}

export async function unpublishAction(postId: string) {
  const c = await context();
  if (!c || !id.safeParse(postId).success) return noAccess;
  const r = await blog.unpublish(c.db, c.ranchId, c.userId, postId);
  if (r.ok) expire(c.slug);
  return r;
}

export async function emptyTrashAction() {
  const c = await context();
  if (!c) return noAccess;
  const r = await blog.emptyTrash(c.db, c.ranchId);
  if (r.ok) expire(c.slug);
  return r;
}

export async function duplicatePostAction(postId: string) {
  const c = await context();
  if (!c || !id.safeParse(postId).success) return noAccess;
  const r = await blog.duplicatePost(c.db, c.ranchId, c.userId, postId);
  if (r.ok) expire(c.slug);
  return r;
}

export async function listRevisionsAction(postId: string) {
  const c = await context();
  if (!c || !id.safeParse(postId).success) return noAccess;
  return blog.listRevisions(c.db, c.ranchId, postId);
}

export async function restoreRevisionAction(postId: string, revisionId: string) {
  const c = await context();
  if (!c || !id.safeParse(postId).success || !id.safeParse(revisionId).success) return noAccess;
  const r = await blog.restoreRevision(c.db, c.ranchId, c.userId, postId, revisionId);
  if (r.ok) expire(c.slug);
  return r;
}

const name = z.string().max(200);

export async function createCategoryAction(n: string) {
  const c = await context();
  if (!c || !name.safeParse(n).success) return noAccess;
  const r = await blog.createCategory(c.db, c.ranchId, n);
  if (r.ok) expire(c.slug);
  return r;
}
export async function renameCategoryAction(catId: string, n: string) {
  const c = await context();
  if (!c || !id.safeParse(catId).success || !name.safeParse(n).success) return noAccess;
  const r = await blog.renameCategory(c.db, c.ranchId, catId, n);
  if (r.ok) expire(c.slug);
  return r;
}
export async function deleteCategoryAction(catId: string) {
  const c = await context();
  if (!c || !id.safeParse(catId).success) return noAccess;
  const r = await blog.deleteCategory(c.db, c.ranchId, catId);
  if (r.ok) expire(c.slug);
  return r;
}
export async function addSuggestedCategoriesAction() {
  const c = await context();
  if (!c) return noAccess;
  const r = await blog.addSuggestedCategories(c.db, c.ranchId);
  if (r.ok) expire(c.slug);
  return r;
}
export async function createTagAction(n: string) {
  const c = await context();
  if (!c || !name.safeParse(n).success) return noAccess;
  return blog.createTag(c.db, c.ranchId, n);
}
export async function renameTagAction(tagId: string, n: string) {
  const c = await context();
  if (!c || !id.safeParse(tagId).success || !name.safeParse(n).success) return noAccess;
  const r = await blog.renameTag(c.db, c.ranchId, tagId, n);
  if (r.ok) expire(c.slug);
  return r;
}
export async function deleteTagAction(tagId: string) {
  const c = await context();
  if (!c || !id.safeParse(tagId).success) return noAccess;
  const r = await blog.deleteTag(c.db, c.ranchId, tagId);
  if (r.ok) expire(c.slug);
  return r;
}

export async function searchLinkTargetsAction(q: string) {
  const c = await context();
  if (!c || typeof q !== "string") return [];
  return blog.searchLinkTargets(c.db, c.ranchId, q);
}
export async function searchRelatedAction(postId: string, q: string) {
  const c = await context();
  if (!c || !id.safeParse(postId).success || typeof q !== "string") return [];
  return blog.searchPostsForRelated(c.db, c.ranchId, q, postId);
}
