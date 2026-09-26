export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Loading…</span>
      <div className="h-9 w-56 bg-surface" />
      <div className="h-24 bg-surface/70" />
      <div className="h-24 bg-surface/50" />
    </div>
  );
}
