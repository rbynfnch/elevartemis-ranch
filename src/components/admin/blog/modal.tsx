"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";

/** A dialog that opens when `open` is true and tells its owner when it closes (Escape, Close, or backdrop). */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] flex-col border border-rule bg-paper p-0 text-ink backdrop:bg-night/60 open:flex ${wide ? "w-[min(56rem,calc(100vw-2rem))]" : "w-[min(36rem,calc(100vw-2rem))]"}`}
    >
      {open ? (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-4">
            <h2 id={titleId} className="font-display text-xl">
              {title}
            </h2>
            <button type="button" className={buttonClasses("quiet", "py-2")} onClick={onClose}>
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-rule px-5 py-3">{footer}</div> : null}
        </>
      ) : null}
    </dialog>
  );
}
