import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { getSiteSettings } from "@/lib/site/get-site";
import { getPost, getPostRedirect } from "@/lib/site/get-posts";
import { plainSummary } from "@/lib/animals/portfolio";
import { JsonLd } from "@/components/site/json-ld";
import { PostArticle } from "@/components/site/post-article";

type Params = PageProps<"/site/[ranch]/on-the-ranch/[slug]">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ranch, slug } = await params;
  const site = await getSiteSettings(ranch);
  const post = site ? await getPost(site.ranchId, site.slug, slug) : null;
  if (!site || !post) return {};
  const description = post.metaDescription ?? post.excerpt ?? plainSummary(post.body, 155) ?? undefined;
  const shareTitle = post.ogTitle ?? post.metaTitle ?? post.title;
  const shareDescription = post.ogDescription ?? description;
  const image = post.ogImage ?? post.photo?.src;
  return {
    title: post.metaTitle ?? post.title,
    description,
    alternates: { canonical: `/on-the-ranch/${post.slug}` },
    openGraph: {
      type: "article",
      title: shareTitle,
      description: shareDescription,
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt || undefined,
      authors: post.authorName ? [post.authorName] : undefined,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: shareTitle, description: shareDescription },
  };
}

export default function Post({ params }: PageProps<"/site/[ranch]/on-the-ranch/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Page params={params} />
    </Suspense>
  );
}

async function Page({ params }: { params: Params }) {
  const { ranch, slug } = await params;
  const site = await getSiteSettings(ranch);
  if (!site) notFound();
  const post = await getPost(site.ranchId, site.slug, slug);
  if (!post) {
    // A post that was renamed keeps working at its old address.
    const moved = await getPostRedirect(site.ranchId, site.slug, slug);
    if (moved) permanentRedirect(`/on-the-ranch/${moved}`);
    notFound();
  }
  const label = site.blogLabel ?? "Happening on the Ranch";
  const image = post.ogImage ?? post.photo?.src;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.metaDescription ?? post.excerpt ?? plainSummary(post.body, 155) ?? undefined,
          datePublished: post.publishedAt || undefined,
          dateModified: post.updatedAt || post.publishedAt || undefined,
          image: image ? [image] : undefined,
          articleSection: post.category?.name,
          keywords: post.tags.length ? post.tags.map((t) => t.name).join(", ") : undefined,
          author: post.authorName
            ? { "@type": "Person", name: post.authorName }
            : { "@type": "Organization", name: site.name },
          publisher: { "@type": "Organization", name: site.name },
          mainEntityOfPage: `/on-the-ranch/${post.slug}`,
        }}
      />
      <PostArticle post={post} siteName={site.name} label={label} brandMark={site.brand.mark} />
    </>
  );
}
