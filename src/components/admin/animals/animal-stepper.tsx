"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Neighbors } from "@/lib/admin/animals/neighbors";

const arrow =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 border border-rule bg-white px-3 text-ink no-underline hover:border-primary hover:bg-surface";

/**
 * Previous and Next arrows between animals, in the order of the Animals list the
 * visitor came from. The left and right arrow keys do the same when nothing is
 * being typed into, so you can go down the list while adding photos.
 */
export function AnimalStepper({
  neighbors,
  prevHref,
  nextHref,
}: {
  neighbors: Neighbors;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // Only when the page itself has focus: never while typing, choosing from a list or inside a dialog.
      const el = document.activeElement;
      if (el && el !== document.body) return;
      if (document.querySelector("dialog[open]")) return;
      const href = e.key === "ArrowLeft" ? prevHref : nextHref;
      if (href) {
        e.preventDefault();
        router.push(href);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevHref, nextHref, router]);

  return (
    <nav aria-label="Move between animals" className="flex items-center gap-2">
      {neighbors.prev && prevHref ? (
        <Link href={prevHref} className={arrow} aria-label={`Previous animal: ${neighbors.prev.name}`}>
          <span aria-hidden="true">←</span>
          <span className="hidden max-w-[10rem] truncate text-sm sm:inline">{neighbors.prev.name}</span>
        </Link>
      ) : (
        <span aria-hidden="true" className={`${arrow} opacity-30`}>
          ←
        </span>
      )}
      <span className="px-1 text-sm tabular-nums text-ink-muted" aria-live="polite">
        {neighbors.position} of {neighbors.total}
      </span>
      {neighbors.next && nextHref ? (
        <Link href={nextHref} className={arrow} aria-label={`Next animal: ${neighbors.next.name}`}>
          <span className="hidden max-w-[10rem] truncate text-sm sm:inline">{neighbors.next.name}</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span aria-hidden="true" className={`${arrow} opacity-30`}>
          →
        </span>
      )}
    </nav>
  );
}
