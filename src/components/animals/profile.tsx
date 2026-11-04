import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { parseVideoUrl } from "@/lib/animals/video";

/** "For Sale" on a ribbon in the corner of the header. */
export function SaleRibbon({ children }: { children: ReactNode }) {
  return (
    <span
      className="absolute right-0 top-0 bg-primary py-2 pl-5 pr-7 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-on-primary"
      style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 0.75rem) 50%, 100% 100%, 0 100%)" }}
    >
      {children}
    </span>
  );
}

/** Birth year, sex, height, color, registration: a big value over a small label, in one row. */
export function AttributeStrip({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-y-5 sm:flex sm:justify-between sm:gap-y-0">
      {items.map((f) => (
        <div
          key={f.label}
          className="flex flex-col-reverse items-center gap-1 whitespace-nowrap px-2 text-center sm:flex-auto sm:border-l sm:border-rule sm:first:border-l-0"
        >
          <dt className="text-[0.5625rem] uppercase tracking-[0.14em] text-ink-muted">{f.label}</dt>
          <dd className="text-xs font-semibold uppercase tracking-[0.06em]">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** One small mark for every highlight, so ranches need no icon library. */
function Mark() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="size-8 text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="16" cy="13" r="7" />
      <circle cx="16" cy="13" r="3.5" />
      <path d="M11.500 19 9 28l7-3 7 3-2.500-9" />
    </svg>
  );
}

/** Up to four short phrases ("Ranch Proven"), each under the same mark. */
export function Highlights({ items }: { items: string[] }) {
  return (
    <ul className="grid grid-cols-2 gap-y-5 sm:grid-flow-col sm:auto-cols-fr sm:gap-y-0">
      {items.map((text) => (
        <li
          key={text}
          className="flex flex-col items-center gap-2 px-2 text-center sm:border-l sm:border-rule sm:first:border-l-0"
        >
          <Mark />
          <span className="font-serif text-[0.9375rem] leading-snug">{text}</span>
        </li>
      ))}
    </ul>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  );
}

/** "Watch Video": opens the owner's link on YouTube, TikTok, Instagram… in a new tab. */
export function WatchVideoLink({ url }: { url: string }) {
  const video = parseVideoUrl(url);
  if (!video.ok) return null;
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses("secondary", "gap-3 uppercase tracking-[0.14em]")}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8.500 6 3.500-6 3.500z" fill="currentColor" />
      </svg>
      Watch Video
      <span className="sr-only"> on {video.platform} (opens in a new tab)</span>
    </a>
  );
}
