import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadBrand } from "@/lib/admin/brand/service";
import { BrandEditor } from "@/components/admin/brand/brand-editor";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Brand" };

export default function BrandPage({ params }: PageProps<"/admin/[ranch]/brand">) {
  return (
    <Suspense fallback={null}>
      <Brand params={params} />
    </Suspense>
  );
}

async function Brand({ params }: { params: PageProps<"/admin/[ranch]/brand">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await loadBrand(await createServerSupabase(), ctx.ranch.id, ctx.ranch.name);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Brand</h1>
      {result.ok ? (
        <BrandEditor initial={result.data} isOwner={ctx.ranch.role === "owner"} />
      ) : (
        <FormMessage>{result.message}</FormMessage>
      )}
    </div>
  );
}
