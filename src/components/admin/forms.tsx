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

const controlBase =
  "block w-full rounded-[2px] border bg-white px-3.5 text-base text-ink border-[color-mix(in_oklab,var(--c-rule)_70%,var(--c-ink-muted))] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

export function TextArea({
  id,
  invalid,
  hasHint,
  className,
  ...props
}: ComponentProps<"textarea"> & { id: string; invalid?: boolean; hasHint?: boolean }) {
  const describedBy = [hasHint ? `${id}-hint` : null, invalid ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy || undefined}
      rows={5}
      className={clsx(controlBase, "py-3 leading-relaxed", invalid && "border-[#8a2b1d]", className)}
      {...props}
    />
  );
}

export function Select({
  id,
  invalid,
  className,
  children,
  ...props
}: ComponentProps<"select"> & { id: string; invalid?: boolean }) {
  return (
    <select
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={clsx(controlBase, "min-h-12", invalid && "border-[#8a2b1d]", className)}
      {...props}
    >
      {children}
    </select>
  );
}

/** A group of radio buttons with a visible legend. */
export function RadioGroup({
  name,
  legend,
  options,
  value,
  defaultValue,
  onChange,
  hint,
  inline,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string; hint?: string }[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  hint?: string;
  inline?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">{legend}</legend>
      {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
      <div className={clsx(inline ? "flex flex-wrap gap-x-5 gap-y-1" : "space-y-1")}>
        {options.map((o) => (
          <label key={o.value} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
            <input
              type="radio"
              name={name}
              value={o.value}
              {...(value !== undefined ? { checked: value === o.value } : { defaultChecked: defaultValue === o.value })}
              onChange={onChange ? () => onChange(o.value) : undefined}
              className="mt-1 size-4 accent-[var(--c-primary)]"
            />
            <span>
              {o.label}
              {o.hint ? <span className="block text-sm text-ink-muted">{o.hint}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Checkbox({
  name,
  label,
  hint,
  ...props
}: ComponentProps<"input"> & { name: string; label: string; hint?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
      <input type="checkbox" name={name} className="mt-1 size-4 accent-[var(--c-primary)]" {...props} />
      <span>
        {label}
        {hint ? <span className="block text-sm text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Titled panel used to split the animal editor into sections. */
export function Panel({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-rule pt-10">
      <h2 id={`${id}-title`} className="font-display text-2xl">
        {title}
      </h2>
      {description ? <p className="mt-2 max-w-[62ch] text-ink-muted">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}
