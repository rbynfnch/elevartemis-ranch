"use client";

import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";

const sizes = [
  { id: "phone", label: "Phone", width: "390px" },
  { id: "tablet", label: "Tablet", width: "820px" },
  { id: "desktop", label: "Desktop", width: "100%" },
] as const;

/** The owner's preview: the real post page in a frame, at phone, tablet or desktop width. */
export function PreviewFrame({ src, editHref, status }: { src: string; editHref: string; status: string }) {
  const [size, setSize] = useState<(typeof sizes)[number]["id"]>("desktop");
  const width = sizes.find((s) => s.id === size)!.width;
  return (
    <div className="bg-surface">
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-rule bg-paper px-4 py-2 text-sm">
        <p className="font-semibold">Preview</p>
        <p className="text-ink-muted">Only you can see this. Status: {status}.</p>
        <div role="group" aria-label="Screen size" className="ml-auto flex">
          {sizes.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={size === s.id}
              onClick={() => setSize(s.id)}
              className={clsx("min-h-10 border border-rule px-3", size === s.id ? "bg-primary text-on-primary" : "bg-white hover:bg-surface")}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Link href={editHref} className="min-h-10 content-center px-2 text-primary underline underline-offset-4">
          Back to editing
        </Link>
      </div>
      <div className="flex justify-center p-4">
        <iframe
          title="Post preview"
          src={src}
          style={{ width, maxWidth: "100%" }}
          className="h-[calc(100dvh-8rem)] border border-rule bg-white"
        />
      </div>
    </div>
  );
}
