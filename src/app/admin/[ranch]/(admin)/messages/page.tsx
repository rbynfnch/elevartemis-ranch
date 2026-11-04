import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import clsx from "clsx";
import { requireAdmin } from "@/lib/auth/admin-context";
import { createServerSupabase } from "@/lib/supabase/server";
import { listInquiries } from "@/lib/admin/inquiries/service";
import { MessageCard } from "@/components/admin/inquiries/message-card";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage({ params, searchParams }: PageProps<"/admin/[ranch]/messages">) {
  return (
    <Suspense fallback={null}>
      <Messages params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Messages({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/[ranch]/messages">["params"];
  searchParams: PageProps<"/admin/[ranch]/messages">["searchParams"];
}) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  const view = (await searchParams).view === "archived" ? "archived" : "inbox";
  const result = await listInquiries(await createServerSupabase(), ctx.ranch.id, view);
  const items = result.ok ? result.data : [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Messages</h1>
        <p className="max-w-[62ch] text-ink-muted">
          What visitors send from your Contact page, newest first. Every message is kept here, whether or not an email
          also reaches you.
        </p>
      </header>
      <nav aria-label="Messages" className="flex gap-2">
        {(
          [
            ["inbox", "Inbox"],
            ["archived", "Archived"],
          ] as const
        ).map(([v, label]) => (
          <Link
            key={v}
            href={v === "inbox" ? "/admin/messages" : "/admin/messages?view=archived"}
            aria-current={view === v ? "page" : undefined}
            className={clsx(
              "min-h-11 border px-4 py-2 no-underline",
              view === v ? "border-primary bg-primary text-on-primary" : "border-rule bg-white hover:bg-surface",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {!result.ok ? <FormMessage>{result.message}</FormMessage> : null}
      {result.ok && items.length === 0 ? (
        <p className="text-ink-muted">{view === "inbox" ? "No messages yet." : "Nothing archived."}</p>
      ) : null}
      <div className="space-y-4">
        {items.map((m) => (
          <MessageCard key={m.id} item={m} />
        ))}
      </div>
    </div>
  );
}
