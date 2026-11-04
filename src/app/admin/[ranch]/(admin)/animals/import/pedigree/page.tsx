import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { PedigreeImportWizard } from "@/components/admin/import/pedigree-import-wizard";

export const metadata: Metadata = { title: "Import pedigrees" };

export default function PedigreeImportPage({ params }: PageProps<"/admin/[ranch]/animals/import/pedigree">) {
  return (
    <Suspense fallback={null}>
      <Import params={params} />
    </Suspense>
  );
}

async function Import({ params }: { params: PageProps<"/admin/[ranch]/animals/import/pedigree">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  return (
    <div className="space-y-8">
      <p className="text-sm">
        <Link href="/admin/animals/import" className="text-primary underline decoration-accent underline-offset-4">
          Import animals
        </Link>
      </p>
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Import pedigrees from a spreadsheet</h1>
        <p className="max-w-[62ch] text-ink-muted">
          Fill in whole pedigrees at once, back as far as seven generations. Each row is one ancestor: whose pedigree it
          is, where the ancestor sits (S for sire, D for dam, SD for the sire&apos;s dam…), and who they are. An
          ancestor that is one of your animals is linked to it, and one who appears more than once is recorded once.
          You&apos;ll see a preview before anything is saved.
        </p>
      </header>
      <PedigreeImportWizard />
    </div>
  );
}
