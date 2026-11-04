"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import type { ListingCard } from "@/lib/animals/cards";
import {
  activeFilterCount,
  applyFilters,
  buildFacets,
  noFilters,
  sortCards,
  sortLabels,
  type SaleFilters,
  type SortKey,
} from "@/lib/animals/for-sale-filter";
import { speciesTerms, type Species } from "@/lib/domain/species";
import { PhotoPlaceholder } from "./photo-placeholder";

/**
 * The For Sale page: a tab for each species with animals for sale, a "Refine
 * results" column (search plus filters that offer only what the animals have),
 * a sort menu, and a card for each animal. Filtering happens as you type or
 * choose, so there is no Apply button to press.
 */
export function ForSaleBrowser({
  animals,
  species,
  initialSpecies,
  brandMark,
}: {
  animals: ListingCard[];
  /** The species that have animals for sale, in menu order. */
  species: Species[];
  initialSpecies: Species;
  brandMark?: string | null;
}) {
  const [active, setActive] = useState<Species>(initialSpecies);
  return (
    <div className="mx-auto max-w-[88rem] px-[var(--gutter)] pb-20">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b border-rule py-6">
        {species.length > 1 ? (
          <div role="tablist" aria-label="Choose what's for sale" className="flex border border-rule">
            {species.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={s === active}
                onClick={() => setActive(s)}
                className={clsx(
                  "min-h-12 px-6 font-serif text-lg transition-colors sm:px-8",
                  s === active ? "bg-primary text-on-primary" : "bg-paper text-ink hover:bg-surface",
                )}
              >
                {speciesTerms[s].plural} for Sale
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="font-serif text-lg italic text-ink-muted">Have a question?</span>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center border border-ink px-5 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-ink no-underline hover:bg-ink hover:text-paper"
          >
            Contact us
          </Link>
        </p>
      </div>
      {/* Keyed by species so each tab starts with its own clean filters. */}
      <SpeciesList
        key={active}
        animals={animals.filter((a) => a.species === active)}
        species={active}
        brandMark={brandMark}
      />
    </div>
  );
}

function SpeciesList({
  animals,
  species,
  brandMark,
}: {
  animals: ListingCard[];
  species: Species;
  brandMark?: string | null;
}) {
  const [filters, setFilters] = useState<SaleFilters>(noFilters);
  const [sort, setSort] = useState<SortKey>("ranch");
  const [open, setOpen] = useState(false);
  const facets = useMemo(() => buildFacets(animals), [animals]);
  const shown = useMemo(() => sortCards(applyFilters(animals, filters), sort), [animals, filters, sort]);
  const set = <K extends keyof SaleFilters>(key: K, value: SaleFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const count = activeFilterCount(filters);
  const hasFilters = Boolean(
    facets.breeds.length || facets.sexes.length > 1 || facets.years.length || facets.colors.length || facets.price,
  );

  const panel = (
    <div className="space-y-5">
      <div>
        <label htmlFor="sale-search" className="block text-sm text-ink-muted">
          Search by name, registration, or keyword
        </label>
        <div className="relative mt-2">
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 4 4" />
          </svg>
          <input
            id="sale-search"
            type="search"
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search…"
            autoComplete="off"
            className="min-h-11 w-full border border-rule bg-white pl-9 pr-3 text-base"
          />
        </div>
      </div>

      {facets.breeds.length > 1 ? (
        <Select
          id="sale-breed"
          label="Breed"
          value={filters.breed}
          onChange={(v) => set("breed", v)}
          options={facets.breeds.map((b) => ({ value: b, label: b }))}
        />
      ) : null}
      {facets.sexes.length > 1 ? (
        <Select id="sale-sex" label="Sex" value={filters.sex} onChange={(v) => set("sex", v)} options={facets.sexes} />
      ) : null}
      {facets.years.length > 1 ? (
        <Select
          id="sale-year"
          label="Age / Year"
          value={filters.year}
          onChange={(v) => set("year", v)}
          options={facets.years.map((y) => ({ value: String(y), label: `Born ${y}` }))}
        />
      ) : null}
      {facets.colors.length > 1 ? (
        <Select
          id="sale-color"
          label="Color"
          value={filters.color}
          onChange={(v) => set("color", v)}
          options={facets.colors.map((c) => ({ value: c, label: c }))}
        />
      ) : null}
      {facets.price && facets.price.max > facets.price.min ? (
        <fieldset>
          <legend className="text-sm font-semibold">Price range</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <PriceInput
              id="sale-min"
              label="From"
              placeholder={facets.price.min}
              value={filters.minPrice}
              onChange={(v) => set("minPrice", v)}
            />
            <PriceInput
              id="sale-max"
              label="To"
              placeholder={facets.price.max}
              value={filters.maxPrice}
              onChange={(v) => set("maxPrice", v)}
            />
          </div>
        </fieldset>
      ) : null}

      {count > 0 ? (
        <button
          type="button"
          onClick={() => setFilters(noFilters)}
          className="text-sm text-primary underline decoration-accent decoration-2 underline-offset-4"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="grid gap-x-10 gap-y-6 pt-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside aria-label="Refine results" className="lg:border-r lg:border-rule lg:pr-8">
        {/* A phone gets the filters tucked behind one button; a wide screen shows them. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="sale-filters"
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between border border-rule bg-white px-4 font-semibold lg:hidden"
        >
          Refine results{count ? ` (${count})` : ""}
          <span aria-hidden="true" className={clsx("transition-transform", open && "rotate-180")}>
            ⌄
          </span>
        </button>
        <div id="sale-filters" className={clsx(open ? "mt-4 block" : "hidden", "lg:mt-0 lg:block")}>
          <h2 className="mb-5 hidden text-[0.75rem] font-semibold uppercase tracking-[0.2em] lg:block">
            Refine results
          </h2>
          {panel}
        </div>
      </aside>

      <section aria-labelledby="sale-heading" className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="sale-heading" className="font-display text-3xl">
            {speciesTerms[species].plural} for Sale{" "}
            <span className="text-ink-muted" aria-label={`${shown.length} shown`}>
              ({shown.length})
            </span>
          </h2>
          {animals.length > 1 ? (
            <div className="flex items-center gap-3 text-sm">
              <label htmlFor="sale-sort" className="text-ink-muted">
                Sort by:
              </label>
              <SelectBox id="sale-sort" value={sort} onChange={(v) => setSort(v as SortKey)}>
                {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {sortLabels[k]}
                  </option>
                ))}
              </SelectBox>
            </div>
          ) : null}
        </div>

        {shown.length === 0 ? (
          <div className="mt-8 max-w-xl space-y-4 border-l-2 border-accent bg-surface px-6 py-5">
            <p>{hasFilters || count ? "Nothing matches those choices." : "There are none listed right now."}</p>
            {count ? (
              <button
                type="button"
                onClick={() => setFilters(noFilters)}
                className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
              >
                Clear the filters
              </button>
            ) : (
              <Link
                href="/contact"
                className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
              >
                Get in touch
              </Link>
            )}
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((a) => (
              <li key={a.href}>
                <SaleCard animal={a} brandMark={brandMark} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SelectBox({
  id,
  value,
  onChange,
  children,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={clsx("relative inline-block", className)}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full appearance-none border border-rule bg-white py-2 pl-3 pr-9 text-base"
      >
        {children}
      </select>
      <svg
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="m3 6 5 5 5-5" />
      </svg>
    </span>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <SelectBox id={id} value={value} onChange={onChange} className="mt-2 block w-full">
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SelectBox>
    </div>
  );
}

function PriceInput({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: number;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-ink-muted">
        {label}
      </label>
      <div className="relative mt-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        >
          $
        </span>
        <input
          id={id}
          inputMode="numeric"
          value={value ?? ""}
          placeholder={String(placeholder)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^\d]/g, ""));
            onChange(e.target.value.replace(/[^\d]/g, "") === "" ? null : n);
          }}
          className="min-h-11 w-full border border-rule bg-white pl-6 pr-2 text-base"
        />
      </div>
    </div>
  );
}

/** A for-sale card: photo, name, a line of facts, the headline, price and a button to the full page. */
function SaleCard({ animal, brandMark }: { animal: ListingCard; brandMark?: string | null }) {
  const facts = [
    animal.breed,
    animal.categoryLabel,
    animal.birthYear ? String(animal.birthYear) : null,
    animal.height,
    animal.headCount ? `${animal.headCount} head` : null,
    animal.weightLb ? `${animal.weightLb.toLocaleString("en-US")} lbs` : null,
    animal.earTag ? `Tag ${animal.earTag}` : null,
  ].filter((f): f is string => Boolean(f && f.trim()));
  return (
    <article className="group relative flex h-full flex-col border border-rule bg-white">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        {animal.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={animal.photo.src}
            alt={animal.photo.alt}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]"
            style={{ objectPosition: `${animal.photo.focalX * 100}% ${animal.photo.focalY * 100}%` }}
          />
        ) : (
          <PhotoPlaceholder mark={brandMark} className="size-full" />
        )}
        {animal.badge === "Sale Pending" ? (
          <span className="absolute left-0 top-4 bg-paper px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.16em]">
            Sale pending
          </span>
        ) : null}
        {animal.featured ? (
          <span className="absolute right-0 top-0 bg-primary px-4 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-on-primary">
            Featured
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl leading-tight">
          <Link href={animal.href} className="no-underline after:absolute after:inset-0">
            {animal.name}
          </Link>
        </h3>
        {facts.length ? (
          <p className="mt-2 flex flex-wrap items-center text-sm text-ink-muted">
            {facts.map((f, i) => (
              <span key={i} className={clsx("whitespace-nowrap", i > 0 && "ml-3 border-l border-rule pl-3")}>
                {f}
              </span>
            ))}
          </p>
        ) : null}
        {animal.tagline ? <p className="mt-3 font-serif italic text-ink-muted">{animal.tagline}</p> : null}
        {animal.price ? <p className="mt-3 font-semibold">{animal.price}</p> : null}
        <div className="mt-auto pt-5">
          <p
            aria-hidden="true"
            className="inline-flex w-fit items-center gap-2 border border-ink px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] group-hover:bg-ink group-hover:text-paper"
          >
            View details
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
            </svg>
          </p>
        </div>
      </div>
    </article>
  );
}
