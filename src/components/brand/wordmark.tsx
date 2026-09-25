import Link from "next/link";
import clsx from "clsx";
import { BrandMark } from "./brand-mark";

type WordmarkProps = {
  name: string;
  subtitle?: string | null;
  mark?: string | null;
  href?: string;
  tone?: "ink" | "light";
  className?: string;
};

/** Ranch wordmark: brass brand mark + name in the display face + italic subtitle. */
export function Wordmark({ name, subtitle, mark, href = "/", tone = "ink", className }: WordmarkProps) {
  const content = (
    <>
      {mark ? <BrandMark letters={mark} className="h-9 w-12 shrink-0 text-accent" /> : null}
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.375rem] tracking-[-0.01em]">{name}</span>
        {subtitle ? <span className="mt-1 font-serif text-sm italic opacity-80">{subtitle}</span> : null}
      </span>
    </>
  );
  const classes = clsx(
    "inline-flex items-center gap-3 no-underline",
    tone === "light" ? "text-on-night" : "text-ink",
    className,
  );
  return (
    <Link href={href} className={classes} aria-label={`${name}${subtitle ? ` ${subtitle}` : ""}, home`}>
      {content}
    </Link>
  );
}
