import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { MfaManager } from "@/components/admin/mfa-manager";
import { PasswordForm } from "@/components/admin/password-form";

export const metadata: Metadata = { title: "Account and security" };

export default function AccountPage({ params }: PageProps<"/admin/[ranch]/account">) {
  return (
    <Suspense fallback={null}>
      <Account params={params} />
    </Suspense>
  );
}

async function Account({ params }: { params: PageProps<"/admin/[ranch]/account">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  return (
    <div className="space-y-14">
      <header>
        <h1 className="font-display text-3xl">Account and security</h1>
        <p className="mt-2 text-ink-muted">Signed in as {ctx.email}</p>
      </header>

      <section aria-labelledby="mfa-heading" className="max-w-xl">
        <h2 id="mfa-heading" className="font-display text-2xl">
          Two-step verification
        </h2>
        <div className="mt-4">
          <MfaManager required={ctx.ranch.requiresMfa} issuer={ctx.ranch.name} />
        </div>
      </section>

      <section aria-labelledby="password-heading" className="max-w-sm">
        <h2 id="password-heading" className="font-display text-2xl">
          Change password
        </h2>
        <PasswordForm submitLabel="Save new password" />
      </section>
    </div>
  );
}
