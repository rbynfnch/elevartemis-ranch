import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadAbout } from "@/lib/admin/about/service";
import { AboutEditor } from "@/components/admin/about/about-editor";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "About Page" };

export default function AboutPageAdmin({ params }: PageProps<"/admin/[ranch]/about-page">) {
  return (
    <Suspense fallback={null}>
      <About params={params} />
    </Suspense>
  );
}

async function About({ params }: { params: PageProps<"/admin/[ranch]/about-page">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await loadAbout(await createServerSupabase(), ctx.ranch.id);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">About Page</h1>
      {result.ok ? <AboutEditor initial={result.data} /> : <FormMessage>{result.message}</FormMessage>}
    </div>
  );
}
