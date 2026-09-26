"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { NavItem } from "@/lib/site/navigation";

/**
 * Full-height mobile menu. Sections for Horses/Cattle list their categories
 * directly (no nested tapping). Escape and link taps close it; focus returns
 * to the toggle. Motion polish arrives in Phase 11.
 */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold"
      >
        {open ? "Close" : "Menu"}
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
          {open ? (
            <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" />
          ) : (
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" />
          )}
        </svg>
      </button>

      <nav
        id={panelId}
        aria-label="Main"
        hidden={!open}
        className="fixed inset-0 z-40 overflow-y-auto bg-paper px-[var(--gutter)] pb-12 pt-24"
      >
        <ul className="space-y-6">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={() => setOpen(false)} className="font-display text-3xl no-underline">
                {item.label}
              </Link>
              {item.heading ? <p className="mt-2 font-serif text-base italic text-ink-muted">{item.heading}</p> : null}
              {item.children ? (
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-l border-rule pl-4">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={() => setOpen(false)}
                        className="inline-block min-h-11 py-2 text-base no-underline"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
