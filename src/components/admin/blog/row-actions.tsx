"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  emptyTrashAction,
  archivePostAction,
  deletePostForeverAction,
  duplicatePostAction,
  restorePostAction,
  trashPostAction,
  unarchivePostAction,
  unpublishAction,
} from "@/lib/admin/blog/actions";
import type { PostStatus } from "@/lib/blog/schedule";
import { FormMessage } from "@/components/admin/forms";

const btn =
  "inline-flex size-10 items-center justify-center text-primary hover:bg-surface focus-visible:outline-2 disabled:opacity-40";
const danger = btn.replace("text-primary", "text-[#8a2b1d]");
const icons = {
  edit: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  view: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  copy: "M9 9h11v11H9zM5 15V4h11",
  unpublish: "M3 3l18 18M10.6 6.2A9.8 9.8 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3.2 3.9M6.6 6.7A17 17 0 002 12s3.5 6 10 6a9.7 9.7 0 004-.9",
  archive: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
  unarchive: "M3 4h18v4H3zM5 8v12h14V8M12 17v-6m-3 3l3-3 3 3",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  restore: "M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5",
} as const;

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Btn({ label, icon, onClick, tone, pending }: { label: string; icon: keyof typeof icons; onClick: () => void; tone?: "danger"; pending: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} className={tone === "danger" ? danger : btn} disabled={pending} onClick={onClick}>
      <Icon d={icons[icon]} />
    </button>
  );
}

function Lnk({ label, icon, href }: { label: string; icon: keyof typeof icons; href: string }) {
  return (
    <a aria-label={label} title={label} className={btn} href={href} target="_blank" rel="noopener noreferrer">
      <Icon d={icons[icon]} />
    </a>
  );
}

/** Quick actions for one row of the post list. */
export function RowActions({ id, title, status, slug, trashed }: { id: string; title: string; status: PostStatus; slug: string; trashed: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const run = (ask: string | null, fn: () => Promise<{ ok: boolean; message?: string; data?: unknown }>, after?: (d: unknown) => void) => {
    if (ask && !window.confirm(ask)) return;
    setError("");
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.message ?? "That didn't work. Please try again.");
      if (after) after(r.data);
      else router.refresh();
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-x-0.5" role="group" aria-label={`Actions for ${title}`}>
      {trashed ? (
        <>
          <Btn pending={pending} label="Restore as a draft" icon="restore" onClick={() => run(null, () => restorePostAction(id))} />
          <Btn pending={pending} label="Delete for good" icon="trash" tone="danger" onClick={() => run(`Delete "${title}" for good? This can't be undone.`, () => deletePostForeverAction(id))} />
        </>
      ) : (
        <>
          <Btn pending={pending} label="Edit" icon="edit" onClick={() => router.push(`/admin/updates/${id}`)} />
          {status === "published" ? (
            <Lnk label="View on your website" icon="view" href={`/on-the-ranch/${slug}`} />
          ) : (
            <Lnk label="Preview" icon="view" href={`/on-the-ranch/preview/${id}`} />
          )}
          <Btn pending={pending} label="Make a copy" icon="copy" onClick={() => run(null, () => duplicatePostAction(id), (d) => router.push(`/admin/updates/${(d as { id: string }).id}`))} />
          {status === "published" || status === "scheduled" ? (
            <Btn pending={pending} label="Take off the website" icon="unpublish" onClick={() => run("Take this post off your website and make it a draft?", () => unpublishAction(id))} />
          ) : null}
          {status === "archived" ? (
            <Btn pending={pending} label="Unarchive" icon="unarchive" onClick={() => run(null, () => unarchivePostAction(id))} />
          ) : (
            <Btn pending={pending} label="Archive" icon="archive" onClick={() => run("Archive this post? It leaves your website but is kept.", () => archivePostAction(id))} />
          )}
          <Btn pending={pending} label="Move to trash" icon="trash" tone="danger" onClick={() => run(`Move "${title}" to the trash? It leaves your website. If you restore it later, it comes back as a draft.`, () => trashPostAction(id))} />
        </>
      )}
      {error ? <FormMessage>{error}</FormMessage> : null}
    </div>
  );
}

export function EmptyTrashButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-3 border border-rule bg-surface p-3 text-sm">
      <span>Posts in the trash are hidden everywhere. Restore one, or delete it for good.</span>
      <button
        type="button"
        disabled={pending}
        className="min-h-9 border border-[#8a2b1d] px-3 text-[#8a2b1d] hover:bg-white disabled:opacity-40"
        onClick={() => {
          if (!window.confirm(`Delete all ${count} post${count === 1 ? "" : "s"} in the trash for good? This can't be undone.`)) return;
          start(async () => {
            const r = await emptyTrashAction();
            if (!r.ok) setError(r.message);
            else router.refresh();
          });
        }}
      >
        Empty the trash
      </button>
      {error ? <FormMessage>{error}</FormMessage> : null}
    </div>
  );
}
