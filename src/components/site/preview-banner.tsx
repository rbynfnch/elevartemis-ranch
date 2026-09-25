/** Shown on ranches that haven't launched yet, so sample content is never mistaken for real. */
export function PreviewBanner() {
  return (
    <div
      role="note"
      className="border-b-2 border-accent bg-night px-[var(--gutter)] py-2 text-center text-sm text-on-night"
    >
      Preview site. Text in [brackets] and sample animals are placeholders to be replaced before launch.
    </div>
  );
}
