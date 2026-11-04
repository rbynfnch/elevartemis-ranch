import type { OffspringYear } from "@/lib/animals/get-relations";
import { AnimalCard } from "@/components/animals/animal-card";

/** A sire's or dam's offspring by year. Built from the foals' own records, so nothing is entered twice. */
export function Offspring({ years, brandMark }: { years: OffspringYear[]; brandMark?: string | null }) {
  return (
    <div className="space-y-10">
      {years.map((y) => (
        <section
          key={y.year ?? "unknown"}
          aria-label={y.year ? String(y.year) : "Birth year not recorded"}
          className="space-y-4"
        >
          {y.year ? <h3 className="font-display text-xl">{y.year}</h3> : null}
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {y.animals.map((a) => (
              <li key={a.href}>
                <AnimalCard animal={a} brandMark={brandMark} />
                {a.parent ? <p className="mt-1 text-sm italic text-ink-muted">{a.parent}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
