import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[2px] font-sans text-[0.9375rem] font-semibold " +
  "tracking-[0.01em] transition-[background-color,color,border-color,transform] duration-200 ease-[var(--ease-out)] " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 min-h-11";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary px-6 py-3 hover:bg-[color-mix(in_oklab,var(--c-primary)_86%,black)]",
  secondary: "border border-current px-6 py-3 text-primary hover:bg-primary hover:text-on-primary hover:border-primary",
  quiet:
    "px-0 py-2 text-primary underline decoration-accent decoration-2 underline-offset-[6px] hover:decoration-primary",
};

export function buttonClasses(variant: Variant = "primary", className?: string) {
  return clsx(base, variants[variant], className);
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
