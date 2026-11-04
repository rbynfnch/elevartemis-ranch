import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { getPostForEdit } from "@/lib/admin/posts/service";
import { PostEditor } from "@/components/admin/posts/post-editor";

export const metadata: Metadata = { title: "Edit post" };

export default function EditPostPage({ params }: PageProps<"/admin/[ranch]/updates/[id]">) {
  return (
    <Suspense fallback={null}>
      <EditPost params={params} />
    </Suspense>
  );
}

async function EditPost({ params }: { params: PageProps<"/admin/[ranch]/updates/[id]">["params"] }) {
  const { ranch, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const ctx = await requireAdmin(ranch);
  if (!ctx) return null;
  const result = await getPostForEdit(await createServerSupabase(), ctx.ranch.id, id);
  if (!result.ok) notFound();
  const post = result.data;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">{post.title === "Untitled post" ? "New post" : "Edit post"}</h1>
      <PostEditor initial={post} ranchLabel="Happening on the Ranch" publicHref={`/on-the-ranch/${post.slug}`} />
    </div>
  );
}
