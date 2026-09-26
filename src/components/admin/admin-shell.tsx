import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import type { AdminRanch } from "@/lib/auth/admin-context";
import { AdminNav } from "./admin-nav";

export function AdminShell({
  ranch,
  email,
  children,
}: {
  ranch: AdminRanch;
  email: string;
  children: React.ReactNode;
}) {
  const footer = (
    <ul className="space-y-0.5 text-[0.9375rem]">
      <li>
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="flex min-h-11 items-center px-3 no-underline hover:bg-surface"
        >
          View website<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </li>
      <li>
        <Link href="/admin/account" className="flex min-h-11 items-center px-3 no-underline hover:bg-surface">
          Account and security
        </Link>
      </li>
      <li>
        <form action={signOut}>
          <button type="submit" className="flex min-h-11 w-full items-center px-3 text-left hover:bg-surface">
            Sign out
          </button>
        </form>
      </li>
    </ul>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-primary focus:px-4 focus:py-3 focus:text-on-primary"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 z-30 border-b border-rule bg-paper lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:px-4 lg:py-6">
          <div className="min-w-0 lg:mb-6 lg:px-3">
            <p className="truncate font-display text-xl leading-tight">{ranch.name}</p>
            <p className="truncate text-sm text-ink-muted">{email}</p>
            {ranch.status !== "live" ? <p className="mt-1 text-sm text-ink-muted">Website not launched yet</p> : null}
          </div>
          <AdminNav footer={footer} />
        </div>
      </aside>
      <main id="admin-main" className="min-w-0 px-5 py-8 sm:px-8 lg:px-14 lg:py-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
