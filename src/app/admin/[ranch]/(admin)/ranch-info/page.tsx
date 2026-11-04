import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadRanchInfo } from "@/lib/admin/ranch-info/service";
import { RanchInfoEditor } from "@/components/admin/ranch-info/ranch-info-editor";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Ranch Info" };

export default function RanchInfoPage({ params }: PageProps<"/admin/[ranch]/ranch-info">) {
  return (
    <Suspense fallback={null}>
      <RanchInfo params={params} />
    </Suspense>
  );
}

async function RanchInfo({ params }: { params: PageProps<"/admin/[ranch]/ranch-info">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await loadRanchInfo(await createServerSupabase(), ctx.ranch.id);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Ranch Info</h1>
      {result.ok ? <RanchInfoEditor initial={result.data} /> : <FormMessage>{result.message}</FormMessage>}
    </div>
  );
}
