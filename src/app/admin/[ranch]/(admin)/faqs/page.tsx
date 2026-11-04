import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadFaqs } from "@/lib/admin/faqs/service";
import { FaqEditor } from "@/components/admin/faqs/faq-editor";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "FAQs" };

export default function FaqsAdmin({ params }: PageProps<"/admin/[ranch]/faqs">) {
  return (
    <Suspense fallback={null}>
      <Faqs params={params} />
    </Suspense>
  );
}

async function Faqs({ params }: { params: PageProps<"/admin/[ranch]/faqs">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await loadFaqs(await createServerSupabase(), ctx.ranch.id);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">FAQs</h1>
      {result.ok ? <FaqEditor initial={result.data} /> : <FormMessage>{result.message}</FormMessage>}
    </div>
  );
}
