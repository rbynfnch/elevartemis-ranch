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
  const btn = "min-h-9 px-2 text-sm text-primary underline decoration-accent underline-offset-4 disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0" aria-label={`Actions for ${title}`}>
      {trashed ? (
        <>
          <button className={btn} disabled={pending} onClick={() => run(null, () => restorePostAction(id))}>Restore</button>
          <button className={btn} disabled={pending} onClick={() => run(`Delete "${title}" for good? This can't be undone.`, () => deletePostForeverAction(id))}>Delete for good</button>
        </>
      ) : (
        <>
          <button className={btn} disabled={pending} onClick={() => router.push(`/admin/updates/${id}`)}>Edit</button>
          {status === "published" ? (
            <a className={btn} href={`/on-the-ranch/${slug}`} target="_blank" rel="noopener noreferrer">View</a>
          ) : (
            <a className={btn} href={`/on-the-ranch/preview/${id}`} target="_blank" rel="noopener noreferrer">Preview</a>
          )}
          <button className={btn} disabled={pending} onClick={() => run(null, () => duplicatePostAction(id), (d) => router.push(`/admin/updates/${(d as { id: string }).id}`))}>Copy</button>
          {status === "published" || status === "scheduled" ? (
            <button className={btn} disabled={pending} onClick={() => run("Take this post off your website and make it a draft?", () => unpublishAction(id))}>Unpublish</button>
          ) : null}
          {status === "archived" ? (
            <button className={btn} disabled={pending} onClick={() => run(null, () => unarchivePostAction(id))}>Unarchive</button>
          ) : (
            <button className={btn} disabled={pending} onClick={() => run("Archive this post? It leaves your website but is kept.", () => archivePostAction(id))}>Archive</button>
          )}
          <button className={btn} disabled={pending} onClick={() => run(`Move "${title}" to the trash? You can restore it later.`, () => trashPostAction(id))}>Trash</button>
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
