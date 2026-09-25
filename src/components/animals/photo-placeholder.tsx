import clsx from "clsx";
import { BrandMark } from "@/components/brand/brand-mark";

/**
 * Shown where an animal has no photo yet. Deliberately quiet — a panel with
 * the ranch's brand mark — so a missing photo never looks like a broken image.
 */
export function PhotoPlaceholder({ mark, className }: { mark?: string | null; className?: string }) {
  return (
    <div
      className={clsx(
        "flex items-center justify-center bg-surface text-[color-mix(in_oklab,var(--c-rule)_80%,var(--c-ink-muted))]",
        className,
      )}
      aria-hidden="true"
    >
      {mark ? <BrandMark letters={mark} className="h-12 w-16 opacity-70" /> : null}
    </div>
  );
}
