"use client";

import clsx from "clsx";
import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";

/** Label + control + hint + error, wired together for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-semibold text-[#8a2b1d]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  invalid,
  hasHint,
  className,
  ...props
}: ComponentProps<"input"> & { id: string; invalid?: boolean; hasHint?: boolean }) {
  const describedBy = [hasHint ? `${id}-hint` : null, invalid ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy || undefined}
      className={clsx(
        "block min-h-12 w-full rounded-[2px] border bg-white px-3.5 text-base text-ink",
        "border-[color-mix(in_oklab,var(--c-rule)_70%,var(--c-ink-muted))] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25",
        invalid && "border-[#8a2b1d]",
        className,
      )}
      {...props}
    />
  );
}

export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={buttonClasses("primary", clsx("w-full", className))}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children?: ReactNode;
}) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "border-l-2 px-3 py-2 text-sm",
        tone === "error" && "border-[#8a2b1d] bg-[#8a2b1d]/5 text-[#6e2217]",
        tone === "success" && "border-primary bg-primary/5 text-primary",
        tone === "info" && "border-accent bg-accent/10 text-ink",
      )}
    >
      {children}
    </p>
  );
}
