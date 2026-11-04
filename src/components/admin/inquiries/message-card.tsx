"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { deleteInquiryAction, setInquiryStatusAction } from "@/lib/admin/inquiries/actions";
import type { InquiryItem } from "@/lib/admin/inquiries/service";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** One message: who sent it, what it says, and what you can do with it. */
export function MessageCard({ item }: { item: InquiryItem }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setBusy(true);
    setError("");
    const r = await action();
    setBusy(false);
    if (!r.ok) setError(r.message ?? "That didn't work. Try again.");
  }

  const archived = item.status === "archived";
  return (
    <article
      className={clsx("border bg-white p-5", item.status === "new" ? "border-l-4 border-primary" : "border-rule")}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl">
            {item.name}
            {item.status === "new" ? (
              <span className="ml-3 bg-primary px-2 py-0.5 align-middle text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-on-primary">
                New
              </span>
            ) : null}
          </h2>
          <p className="text-sm">
            <a href={`mailto:${item.email}`} className="text-primary underline decoration-accent underline-offset-4">
              {item.email}
            </a>
          </p>
        </div>
        <p className="text-sm text-ink-muted">{when(item.createdAt)}</p>
      </header>
      {item.topic || item.animalName ? (
        <p className="mt-3 text-sm text-ink-muted">
          Interested in: <strong className="text-ink">{item.topic ?? item.animalName}</strong>
          {item.animalId && item.animalName ? (
            <>
              {" · "}
              <Link href={`/admin/animals/${item.animalId}`} className="underline underline-offset-4">
                Open {item.animalName}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <p className="mt-4 whitespace-pre-wrap">{item.message}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a
          href={`mailto:${item.email}?subject=${encodeURIComponent("Re: your message")}`}
          className={buttonClasses("primary", "py-2")}
        >
          Reply by email
        </a>
        {!archived ? (
          <button
            type="button"
            disabled={busy}
            className={buttonClasses("secondary", "py-2")}
            onClick={() => run(() => setInquiryStatusAction(item.id, item.status === "new" ? "read" : "new"))}
          >
            {item.status === "new" ? "Mark as read" : "Mark as new"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          className={buttonClasses("secondary", "py-2")}
          onClick={() => run(() => setInquiryStatusAction(item.id, archived ? "read" : "archived"))}
        >
          {archived ? "Move back to inbox" : "Archive"}
        </button>
        <button
          type="button"
          disabled={busy}
          className={buttonClasses("quiet", "py-2")}
          onClick={() => {
            if (window.confirm(`Delete the message from ${item.name}? This can't be undone.`))
              run(() => deleteInquiryAction(item.id));
          }}
        >
          Delete
        </button>
      </div>
      <FormMessage>{error}</FormMessage>
    </article>
  );
}
