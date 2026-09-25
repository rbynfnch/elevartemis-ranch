/**
 * Temporary text-based brand mark, drawn like a registered livestock "bar"
 * brand: the ranch's letters under a single iron bar. Replace per ranch by
 * uploading a logo (ranch_branding.logo_media_id) — no code change needed.
 */
export function BrandMark({ letters, className }: { letters: string; className?: string }) {
  const text = letters.slice(0, 3).toUpperCase();
  return (
    <svg viewBox="0 0 64 48" role="presentation" aria-hidden="true" focusable="false" className={className}>
      <line x1="12" y1="9" x2="52" y2="9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <text
        x="32"
        y="40"
        textAnchor="middle"
        fill="currentColor"
        style={{ fontFamily: "var(--ff-display)", fontSize: text.length > 2 ? 21 : 27, letterSpacing: "0.02em" }}
      >
        {text}
      </text>
    </svg>
  );
}
