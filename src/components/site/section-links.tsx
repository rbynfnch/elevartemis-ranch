import Link from "next/link";
import type { NavItem } from "@/lib/site/navigation";

type Props = { items: NavItem[]; descriptions?: Partial<Record<string, string>> };

type IconName = "horse" | "cattle" | "tag" | "news" | "person" | "mail";

/** Short, claim-free descriptors. Species lines come from the ranch's own heading when set. */
const defaults: Record<string, { icon: IconName; line: string }> = {
  "/horses": { icon: "horse", line: "Our horses" },
  "/cattle": { icon: "cattle", line: "Our cattle" },
  "/for-sale": { icon: "tag", line: "Current offerings" },
  "/on-the-ranch": { icon: "news", line: "News and updates" },
  "/about": { icon: "person", line: "Our story" },
  "/contact": { icon: "mail", line: "Get in touch" },
};

/**
 * The row of section links under the hero. Built from the real navigation, so
 * a section with nothing public in it never gets a tile. "For Sale" appears
 * once any horse or cattle is listed.
 */
export function SectionLinks({ items, descriptions = {} }: Props) {
  const tiles = items
    .filter((i) => i.href !== "/" && defaults[i.href])
    .map((i) => ({
      href: i.href,
      label: i.label,
      icon: defaults[i.href].icon,
      line: descriptions[i.href] ?? i.heading ?? defaults[i.href].line,
    }));
  if (tiles.length === 0) return null;

  return (
    <nav aria-label="Explore the ranch" className="border-b border-rule bg-paper">
      <ul className="mx-auto grid max-w-[88rem] grid-cols-2 px-[var(--gutter)] py-2 sm:grid-cols-3 lg:flex lg:justify-between lg:py-0">
        {tiles.map((t, i) => (
          <li key={t.href} className="lg:flex-1">
            <Link
              href={t.href}
              className={`group flex h-full flex-col items-center px-3 py-7 text-center no-underline lg:py-9 ${i > 0 ? "lg:border-l lg:border-rule" : ""}`}
            >
              <Icon name={t.icon} />
              <span className="mt-4 text-[0.75rem] font-semibold uppercase tracking-[0.2em] decoration-accent decoration-2 underline-offset-8 group-hover:underline">
                {t.label}
              </span>
              <span className="mt-1.5 font-serif text-sm italic text-ink-muted">{t.line}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Icon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 40 40",
    className: "size-10 text-primary transition-transform duration-300 group-hover:-translate-y-0.5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "horse":
      return (
        <svg {...common}>
          <path d="M14 33c0-6 1-9 3-12-3-1-5-4-5-8l-3-4 5 1 4-4 1 5c5 0 9 3 10 8l2 9c.4 2-1 4-3 4h-5" />
          <path d="M17 21c2 1 5 1 7-1" />
          <circle cx="21" cy="13" r=".6" fill="currentColor" />
        </svg>
      );
    case "cattle":
      return (
        <svg {...common}>
          <path d="M8 10c0 4 2 6 5 7M32 10c0 4-2 6-5 7" />
          <path d="M13 17c0-3 3-5 7-5s7 2 7 5v6c0 5-3 9-7 9s-7-4-7-9z" />
          <path d="M16 26c1 1 2 1.500 4 1.500s3-.5 4-1.500" />
          <circle cx="17" cy="20" r=".7" fill="currentColor" />
          <circle cx="23" cy="20" r=".7" fill="currentColor" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M6 20 20 6h13v13L19 33z" />
          <circle cx="26.500" cy="13.500" r="2" />
        </svg>
      );
    case "news":
      return (
        <svg {...common}>
          <path d="M5 28h30M10 28a10 10 0 0 1 20 0M20 8v4M9 14l3 3M31 14l-3 3" />
          <path d="M8 33h24" />
        </svg>
      );
    case "person":
      return (
        <svg {...common}>
          <circle cx="20" cy="14" r="5" />
          <path d="M9 33c1-7 5-10 11-10s10 3 11 10" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="6" y="10" width="28" height="20" rx="1.500" />
          <path d="m7 12 13 10 13-10" />
        </svg>
      );
  }
}
