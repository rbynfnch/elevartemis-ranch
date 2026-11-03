import Link from "next/link";
import { AnimalCard } from "@/components/animals/animal-card";
import type { ListingCard } from "@/lib/animals/cards";
import { groupByBirthYear } from "@/lib/animals/listing-groups";

/** Home / Cattle / Bulls. The last item is the page you're on, so it isn't a link. */
export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {[{ label: "Home", href: "/" }, ...items].map((item, i, all) => (
          <li key={item.label} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href && i < all.length - 1 ? (
              <Link
                href={item.href}
                className="no-underline hover:text-ink hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={i === all.length - 1 ? "page" : undefined}
                className={i === all.length - 1 ? "text-ink" : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ListingHeader({
  eyebrow,
  title,
  crumbs,
}: {
  eyebrow?: string | null;
  title: string;
  crumbs: { label: string; href?: string }[];
}) {
  return (
    <header className="space-y-5">
      <Crumbs items={crumbs} />
      <div className="space-y-3">
        {eyebrow ? <p className="font-serif text-lg italic text-ink-muted">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl sm:text-display">{title}</h1>
        <div className="rule-lead max-w-xs" />
      </div>
    </header>
  );
}

export function AnimalGrid({ animals, brandMark }: { animals: ListingCard[]; brandMark?: string | null }) {
  return (
    <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {animals.map((a) => (
        <li key={a.href}>
          <AnimalCard animal={a} brandMark={brandMark} />
        </li>
      ))}
    </ul>
  );
}

/** Foals and calves under the year they were born, newest year first. */
export function YearGroups({ animals, brandMark }: { animals: ListingCard[]; brandMark?: string | null }) {
  const groups = groupByBirthYear(animals);
  return (
    <div className="space-y-14">
      {groups.map((g) => (
        <section key={g.year ?? "unknown"} aria-label={g.year ? String(g.year) : undefined} className="space-y-6">
          {g.year ? <h2 className="font-display text-2xl">{g.year}</h2> : null}
          <AnimalGrid animals={g.animals} brandMark={brandMark} />
        </section>
      ))}
    </div>
  );
}

export function EmptyListing() {
  return (
    <div className="max-w-xl space-y-4 border-l-2 border-accent bg-surface px-6 py-5">
      <p>There are none listed right now. Questions about what&apos;s coming? We&apos;d love to hear from you.</p>
      <Link
        href="/contact"
        className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
      >
        Get in touch
      </Link>
    </div>
  );
}
