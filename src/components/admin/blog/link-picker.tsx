"use client";

import { useEffect, useState } from "react";
import { searchLinkTargetsAction } from "@/lib/admin/blog/actions";
import type { LinkTarget } from "@/lib/admin/blog/service";
import { safeLink } from "@/lib/blog/content";
import { TextInput } from "@/components/admin/forms";

/**
 * A web address field that can also find the ranch's own pages, stories and animals by name,
 * so links to the ranch's own site never have to be typed.
 */
export function LinkPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (href: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LinkTarget[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;
    let stale = false;
    const t = setTimeout(() => {
      setSearching(true);
      void searchLinkTargetsAction(query).then((r) => {
        if (stale) return;
        setResults(r);
        setSearching(false);
      });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query]);

  const shown = query.trim() ? results : [];
  const bad = value.trim() !== "" && !safeLink(value);
  return (
    <div className="space-y-2">
      <TextInput
        id={id}
        value={value}
        invalid={bad}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… or choose one of your own pages below"
        autoComplete="off"
      />
      {bad ? (
        <p id={`${id}-error`} className="text-sm font-semibold text-[#8a2b1d]">
          Start the address with https:// (or choose a page below).
        </p>
      ) : null}
      <div>
        <label htmlFor={`${id}-find`} className="block text-sm text-ink-muted">
          Or find one of your pages, stories or animals
        </label>
        <TextInput id={`${id}-find`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a name" />
      </div>
      {searching ? <p className="text-sm text-ink-muted">Searching…</p> : null}
      {shown.length ? (
        <ul className="max-h-44 divide-y divide-rule overflow-y-auto border border-rule bg-white">
          {shown.map((t) => (
            <li key={`${t.kind}-${t.href}`}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left hover:bg-surface"
                onClick={() => {
                  onChange(t.href);
                  setQuery("");
                }}
              >
                <span>{t.label}</span>
                <span className="text-xs uppercase tracking-wide text-ink-muted">{t.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
