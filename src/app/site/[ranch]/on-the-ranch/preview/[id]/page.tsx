import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/site/get-site";
import { getEditorData } from "@/lib/admin/blog/service";
import { assemblePost } from "@/lib/site/get-posts";
import { PostArticle } from "@/components/site/post-article";
import { PreviewFrame } from "@/components/site/preview-frame";

type Props = PageProps<"/site/[ranch]/on-the-ranch/preview/[id]">;

// A preview is private: never indexed, never cached.
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default function PreviewPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={null}>
      <Preview params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Preview({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const { ranch, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const site = await getSiteSettings(ranch);
  if (!site) notFound();
  // Only a signed-in owner or editor of this ranch gets past here; everyone else sees "not found".
  const ctx = await requireAdmin(site.slug);
  if (!ctx) notFound();
  const db = await createServerSupabase();
  const edit = await getEditorData(db, ctx.ranch.id, id);
  if (!edit.ok) notFound();
  const s = edit.data.snapshot;

  const [{ data: row }, { data: media }] = await Promise.all([
    db.from("posts").select("updated_at, published_at").eq("id", id).eq("ranch_id", ctx.ranch.id).maybeSingle(),
    db.from("post_media").select("media_id, sort_order").eq("post_id", id).order("sort_order"),
  ]);
  const post = await assemblePost(
    db,
    ctx.ranch.id,
    {
      id,
      title: s.title || "Untitled post",
      slug: s.slug || "preview",
      excerpt: s.excerpt || null,
      body: s.body,
      publishedAt: s.publishedAt ?? row?.published_at ?? new Date().toISOString(),
      updatedAt: row?.updated_at ?? new Date().toISOString(),
      categoryId: s.categoryId,
      featuredMediaId: s.featuredMediaId,
      authorName: s.authorName || null,
      showAuthor: s.showAuthor,
      metaTitle: s.metaTitle || null,
      metaDescription: s.metaDescription || null,
      focusPhrase: null,
      ogTitle: s.ogTitle || null,
      ogDescription: s.ogDescription || null,
      ogMediaId: s.ogMediaId,
      tagIds: s.tagIds,
      relatedIds: s.relatedIds,
      animalIds: s.animalIds,
      extraMediaIds: (media ?? []).map((m) => m.media_id),
    },
    { neighbors: false },
  );
  const label = site.blogLabel ?? "Happening on the Ranch";

  if ((await searchParams).frame === "1")
    return <PostArticle post={post} siteName={site.name} label={label} brandMark={site.brand.mark} />;
  return (
    <PreviewFrame
      src={`/on-the-ranch/preview/${id}?frame=1`}
      editHref={`/admin/updates/${id}`}
      status={edit.data.hasWorkingCopy ? "live, showing your unpublished edits" : edit.data.status}
    />
  );
}
