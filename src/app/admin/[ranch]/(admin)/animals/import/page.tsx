import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { ImportWizard } from "@/components/admin/import/import-wizard";

export const metadata: Metadata = { title: "Import animals" };

export default function ImportPage({ params }: PageProps<"/admin/[ranch]/animals/import">) {
  return (
    <Suspense fallback={null}>
      <Import params={params} />
    </Suspense>
  );
}

async function Import({ params }: { params: PageProps<"/admin/[ranch]/animals/import">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  return (
    <div className="space-y-8">
      <p className="text-sm">
        <Link href="/admin/animals" className="text-primary underline decoration-accent underline-offset-4">
          Animals
        </Link>
      </p>
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Import animals from a spreadsheet</h1>
        <p className="max-w-[62ch] text-ink-muted">
          Add or update many animals at once from a CSV file. Download the template to see the columns, or download your
          current animals, edit them in Excel or Google Sheets, and upload the file again. You&apos;ll see a preview and
          every problem before anything is saved.
        </p>
      </header>
      <ImportWizard />
    </div>
  );
}
