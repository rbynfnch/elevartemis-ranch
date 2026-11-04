import Link from "next/link";

/**
 * On a phone, the two actions a buyer wants stay at the bottom of the screen: ask about this animal, and
 * call. Hidden on wide screens, where the Inquire button is already in view beside the photos.
 */
export function MobileActionBar({
  inquiryHref,
  phone,
  label = "Inquire",
}: {
  inquiryHref: string;
  phone: string | null;
  label?: string;
}) {
  const tel = phone ? phone.replace(/[^\d+]/g, "") : "";
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-xl gap-3">
        <Link
          href={inquiryHref}
          className="inline-flex min-h-12 flex-1 items-center justify-center bg-primary px-4 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-on-primary no-underline"
        >
          {label}
        </Link>
        {tel ? (
          <a
            href={`tel:${tel}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-ink px-5 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-ink no-underline"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M6 3h3l2 5-2 1.5a11 11 0 0 0 5.5 5.5L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3Z" />
            </svg>
            Call
          </a>
        ) : null}
      </div>
    </div>
  );
}
