"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

export const adminSections = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/animals", label: "Animals" },
  { href: "/admin/homepage", label: "Homepage" },
  { href: "/admin/updates", label: "What's Happening" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/faqs", label: "FAQs" },
  { href: "/admin/about-page", label: "About Page" },
  { href: "/admin/ranch-info", label: "Ranch Info" },
  { href: "/admin/recently-deleted", label: "Recently Deleted" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ footer }: { footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <ul className="space-y-0.5">
      {adminSections.map((s) => (
        <li key={s.href}>
          <Link
            href={s.href}
            aria-current={isActive(pathname, s.href) ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={clsx(
              "flex min-h-11 items-center rounded-[2px] px-3 text-[0.9375rem] no-underline",
              isActive(pathname, s.href) ? "bg-primary font-semibold text-on-primary" : "text-ink hover:bg-surface",
            )}
          >
            {s.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold lg:hidden"
        aria-expanded={open}
        aria-controls="admin-nav"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : "Menu"}
      </button>
      <nav
        id="admin-nav"
        aria-label="Admin"
        className={clsx(
          "lg:block",
          open ? "fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-paper px-5 py-6" : "hidden",
        )}
      >
        {links}
        <div className="mt-8 border-t border-rule pt-4" onClick={() => setOpen(false)}>
          {footer}
        </div>
      </nav>
    </>
  );
}
