import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { PasswordForm } from "@/components/admin/password-form";

export const metadata: Metadata = { title: "Choose a password" };

export default function SetPasswordPage({ searchParams }: PageProps<"/admin/[ranch]/set-password">) {
  return (
    <Suspense fallback={<div className="h-80" />}>
      <SetPassword searchParams={searchParams} />
    </Suspense>
  );
}

async function SetPassword({
  searchParams,
}: {
  searchParams: PageProps<"/admin/[ranch]/set-password">["searchParams"];
}) {
  const welcome = (await searchParams).welcome === "1";
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <h1 className="font-display text-3xl">That link has expired</h1>
        <p className="mt-3 text-ink-muted">Password links work once and expire after a while.</p>
        <p className="mt-6">
          <Link href="/admin/forgot-password" className="text-primary underline decoration-accent underline-offset-4">
            Send a new link
          </Link>
        </p>
      </>
    );
  }

  // With two-step verification on, the code is needed before a password change.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/admin/login/verify?next=${encodeURIComponent("/admin/set-password")}`);
  }

  return (
    <>
      <h1 className="font-display text-3xl">{welcome ? "Choose your password" : "Choose a new password"}</h1>
      {welcome ? <p className="mt-3 text-ink-muted">You&apos;ll use this with {user.email} to sign in.</p> : null}
      <PasswordForm then="dashboard" submitLabel={welcome ? "Save and continue" : "Save new password"} />
    </>
  );
}
