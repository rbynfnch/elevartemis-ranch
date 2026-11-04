"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { RichText } from "@/lib/content/rich-text";
import { richTextIsEmpty } from "@/lib/content/empty";
import { bracketPlace, parentPaths, type Pedigree, type PedigreeNode } from "@/lib/animals/pedigree";

/**
 * A pedigree for visitors. On a wide screen it is a bracket (the animal on the
 * left, parents, then grandparents); on a phone it is a stacked list with each
 * generation indented. A horse the ranch has a page for is a link; anyone else
 * is plain text. Ancestors nobody recorded are simply absent.
 */
export function PedigreeTree({
  pedigree: full,
  animalName,
  breed,
}: {
  pedigree: Pedigree;
  animalName: string;
  /** The animal's own breed: an ancestor's breed is shown only when it differs. */
  breed?: string | null;
}) {
  // Three generations to start with; the visitor can open it up to as many as are recorded (up to five).
  const [shown, setShown] = useState(Math.min(full.depth, 3));
  const pedigree = useMemo<Pedigree>(() => {
    const ancestors = new Map([...full.ancestors].filter(([path]) => path.length <= shown));
    return { self: full.self, ancestors, depth: Math.min(full.depth, shown) };
  }, [full, shown]);
  const { ancestors, depth } = pedigree;
  const rows = 2 ** depth;
  const placed = [...ancestors.values()];
  // Counted the way breeders do: the animal is generation 1, its parents generation 2, and so on.
  const options = Array.from({ length: Math.max(0, full.depth - 2) }, (_, i) => i + 3);

  return (
    <div>
      {options.length > 1 ? (
        <div className="mb-4 flex items-center gap-2 text-sm" role="group" aria-label="Generations shown">
          <span className="text-ink-muted">Show</span>
          {options.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={n === depth}
              onClick={() => setShown(n)}
              className={clsx(
                "min-w-9 border px-2.5 py-1 font-semibold",
                n === depth
                  ? "border-primary bg-primary text-white"
                  : "border-rule bg-white text-ink hover:border-primary",
              )}
            >
              {n + 1}
            </button>
          ))}
          <span className="text-ink-muted">generations</span>
        </div>
      ) : null}
      {/* Wide screens: the bracket. */}
      <div
        className="hidden gap-x-4 lg:grid"
        data-generations={depth}
        style={{
          gridTemplateColumns: `repeat(${depth + 1}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(${depth > 4 ? "1.75rem" : depth > 3 ? "2.25rem" : "3.5rem"}, auto))`,
        }}
      >
        <div className="relative flex items-center" style={{ gridColumn: 1, gridRow: `1 / span ${rows}` }}>
          <Card strong>
            <span className="font-display text-lg">{animalName}</span>
          </Card>
          <span aria-hidden="true" className="absolute -right-3 top-1/2 w-3 border-t border-ink-muted/50" />
        </div>
        {placed.map((n) => {
          const place = bracketPlace(n.path, depth);
          const isSire = n.path.endsWith("S");
          const hasParents = parentPaths(n.path).some((p) => ancestors.has(p));
          return (
            <div
              key={n.path}
              className="relative flex items-center py-1"
              style={{ gridColumn: place.column, gridRow: `${place.rowStart} / span ${place.rowSpan}` }}
            >
              {/* The line joining this ancestor to the animal it belongs to. */}
              <span aria-hidden="true" className="absolute -left-3 top-1/2 w-3 border-t border-ink-muted/50" />
              <span
                aria-hidden="true"
                className={clsx(
                  "absolute -left-3 border-l border-ink-muted/50",
                  isSire ? "top-1/2 bottom-0" : "top-0 h-1/2",
                )}
              />
              <Ancestor node={n} breed={breed} compact={n.generation > 3} />
              {hasParents ? (
                <span aria-hidden="true" className="absolute -right-3 top-1/2 w-3 border-t border-ink-muted/50" />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Phones and tablets: a stacked list. */}
      <ul className="space-y-3 lg:hidden">
        <li>
          <Card strong>
            <span className="font-display text-lg">{animalName}</span>
          </Card>
          <Branch path="" pedigree={pedigree} breed={breed} />
        </li>
      </ul>
    </div>
  );
}

function Branch({ path, pedigree, breed }: { path: string; pedigree: Pedigree; breed?: string | null }) {
  const kids = parentPaths(path)
    .map((p) => pedigree.ancestors.get(p))
    .filter((n): n is PedigreeNode => Boolean(n));
  if (kids.length === 0) return null;
  return (
    <ul className={clsx("mt-3 space-y-3 border-l border-ink-muted/40", path.length >= 3 ? "ml-1 pl-2" : "ml-3 pl-4")}>
      {kids.map((n) => (
        <li key={n.path}>
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {n.path.endsWith("S") ? "Sire" : "Dam"}
          </p>
          <Ancestor node={n} breed={breed} />
          <Branch path={n.path} pedigree={pedigree} breed={breed} />
        </li>
      ))}
    </ul>
  );
}

function Card({ children, strong, compact }: { children: ReactNode; strong?: boolean; compact?: boolean }) {
  return (
    <div
      className={clsx(
        "w-full text-sm",
        compact ? "px-2 py-1 text-xs" : "px-3 py-2",
        strong ? "bg-primary/10" : "bg-surface",
      )}
    >
      {children}
    </div>
  );
}

/** "Sorrel · 15.3hh · 2019": whatever of color, height and year is recorded. */
function traits(node: PedigreeNode, breed: string | null | undefined): string {
  return [
    node.breed && node.breed !== breed ? node.breed : null,
    node.color,
    node.height,
    node.birthYear ? String(node.birthYear) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Ancestor({ node, breed, compact }: { node: PedigreeNode; breed?: string | null; compact?: boolean }) {
  const name = node.href ? (
    <Link
      href={node.href}
      className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
    >
      {node.name}
    </Link>
  ) : (
    <span className="font-semibold">{node.name}</span>
  );
  const hasNotes = !richTextIsEmpty(node.notes);
  const line = traits(node, breed);
  return (
    <Card compact={compact}>
      {name}
      {line ? <span className="block text-xs leading-snug text-ink-muted">{line}</span> : null}
      {node.registration && !compact ? <span className="block text-xs text-ink-muted">{node.registration}</span> : null}
      {hasNotes ? (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-ink-muted underline decoration-rule underline-offset-2">
            About {node.name}
          </summary>
          <RichText doc={node.notes} className="prose-ranch mt-1 text-sm text-ink-muted" />
        </details>
      ) : null}
    </Card>
  );
}
