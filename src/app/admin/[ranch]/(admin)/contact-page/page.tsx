import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadContact } from "@/lib/admin/contact/service";
import { ContactEditor } from "@/components/admin/contact/contact-editor";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Contact Page" };

export default function ContactPageAdmin({ params }: PageProps<"/admin/[ranch]/contact-page">) {
  return (
    <Suspense fallback={null}>
      <Contact params={params} />
    </Suspense>
  );
}

async function Contact({ params }: { params: PageProps<"/admin/[ranch]/contact-page">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const result = await loadContact(await createServerSupabase(), ctx.ranch.id);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Contact Page</h1>
      {result.ok ? <ContactEditor initial={result.data} /> : <FormMessage>{result.message}</FormMessage>}
    </div>
  );
}
