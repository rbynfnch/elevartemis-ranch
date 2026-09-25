import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-lg flex-col justify-center px-6 py-24">
      <h1 className="font-display text-3xl">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-ink-muted">It may have moved, or the address may be mistyped.</p>
      <p className="mt-6">
        <Link href="/" className="font-semibold text-primary underline decoration-accent underline-offset-4">
          Go to the home page
        </Link>
      </p>
    </main>
  );
}
