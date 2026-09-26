import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAdminContext } from "@/lib/auth/admin-context";
import { signOut } from "@/lib/auth/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { MfaManager } from "@/components/admin/mfa-manager";
import { buttonClasses } from "@/components/ui/button";

export default function AdminLayout({ children, params }: LayoutProps<"/admin/[ranch]">) {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
          <div className="border-r border-rule" />
        </div>
      }
    >
      <AdminFrame params={params}>{children}</AdminFrame>
    </Suspense>
  );
}

async function AdminFrame({
  children,
  params,
}: {
  children: React.ReactNode;
  params: LayoutProps<"/admin/[ranch]">["params"];
}) {
  const ctx = await getAdminContext((await params).ranch);

  switch (ctx.status) {
    case "signed-out":
      redirect("/admin/login");
    case "needs-mfa":
      redirect("/admin/login/verify");
    case "no-access":
      return (
        <main className="mx-auto max-w-md px-5 py-24">
          <h1 className="font-display text-3xl">No ranch connected</h1>
          <p className="mt-3 text-ink-muted">
            {ctx.email} doesn&apos;t have access to this ranch&apos;s website. If you think it should, contact
            Elevartemis.
          </p>
          <form action={signOut} className="mt-8">
            <button className={buttonClasses("secondary")}>Sign out</button>
          </form>
        </main>
      );
    case "needs-enrollment":
      return (
        <main className="mx-auto max-w-xl px-5 py-16">
          <p className="text-sm font-semibold text-ink-muted">{ctx.ranch.name}</p>
          <h1 className="mt-2 font-display text-3xl">Set up two-step verification</h1>
          <p className="mt-3 max-w-[60ch] text-ink-muted">
            Your ranch requires a code from an authenticator app when you sign in. It takes about two minutes.
          </p>
          <div className="mt-8">
            <MfaManager required issuer={ctx.ranch.name} />
          </div>
          <form action={signOut} className="mt-10">
            <button className={buttonClasses("quiet")}>Sign out</button>
          </form>
        </main>
      );
    case "ok":
      return (
        <AdminShell ranch={ctx.ranch} email={ctx.email}>
          {children}
        </AdminShell>
      );
  }
}
