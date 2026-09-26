import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/lib/auth/safe-next";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Enter your code" };

export default function VerifyPage({ searchParams }: PageProps<"/admin/[ranch]/login/verify">) {
  return (
    <>
      <h1 className="font-display text-3xl">Enter your code</h1>
      <p className="mt-3 text-ink-muted">
        Open your authenticator app and enter the 6-digit code for your ranch website.
      </p>
      <Suspense fallback={<div className="h-48" />}>
        <Verify searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Verify({ searchParams }: { searchParams: PageProps<"/admin/[ranch]/login/verify">["searchParams"] }) {
  const params = await searchParams;
  return <VerifyForm next={safeNext(params.next)} />;
}
