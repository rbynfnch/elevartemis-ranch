import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { getEditorData, getTaxonomy } from "@/lib/admin/blog/service";
import { PostEditor } from "@/components/admin/blog/post-editor";

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
  const db = await createServerSupabase();
  const [result, taxonomy] = await Promise.all([getEditorData(db, ctx.ranch.id, id), getTaxonomy(db, ctx.ranch.id)]);
  if (!result.ok) notFound();
  return (
    <PostEditor
      data={result.data}
      taxonomy={taxonomy}
      ranchName={ctx.ranch.name}
    />
  );
}
