"use client";

import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  addSuggestedCategoriesAction,
  createCategoryAction,
  createTagAction,
  listRevisionsAction,
  restoreRevisionAction,
  searchRelatedAction,
} from "@/lib/admin/blog/actions";
import { searchAnimalsAction } from "@/lib/admin/library/actions";
import type { RevisionItem, Taxonomy } from "@/lib/admin/blog/service";
import type { PostSnapshot } from "@/lib/admin/blog/snapshot";
import { descriptionGuidance, searchPreview, slugChangeWarning, suggestDescription, suggestTitle, titleGuidance } from "@/lib/blog/seo";
import { formatWhen, zoneLabel } from "@/lib/blog/schedule";
import { plainText } from "@/lib/blog/content";
import { Field, FormMessage, Select, TextArea, TextInput } from "@/components/admin/forms";
import { PhotoChooser } from "@/components/admin/banners/photo-chooser";
import { buttonClasses } from "@/components/ui/button";

export function Panel({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border border-rule bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-display text-lg marker:hidden">
        {title}
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-4 border-t border-rule p-4">{children}</div>
    </details>
  );
}

export type FormState = Omit<PostSnapshot, "body" | "publishedAt" | "version"> & {
  body: unknown;
  publishedLocal: string;
  featuredThumb: string | null;
  ogThumb: string | null;
};
type Setter = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

const guidanceTone = { good: "text-primary", warn: "text-[#8a2b1d]", info: "text-ink-muted" } as const;

// ─── Post details ────────────────────────────────────────────────────────────
export function DetailsPanel({
  f,
  set,
  postId,
  wasLive,
  liveSlug,
  slugTouched,
  onSlug,
  words,
  minutes,
  animalNames,
  titles,
  onNames,
}: {
  f: FormState;
  set: Setter;
  postId: string;
  wasLive: boolean;
  liveSlug: string | null;
  slugTouched: boolean;
  onSlug: (v: string) => void;
  words: number;
  minutes: number;
  animalNames: Record<string, string>;
  titles: Record<string, string>;
  onNames: (a: Record<string, string>, t: Record<string, string>) => void;
}) {
  const [animalQ, setAnimalQ] = useState("");
  const [animals, setAnimals] = useState<{ id: string; name: string }[]>([]);
  const [relQ, setRelQ] = useState("");
  const [rel, setRel] = useState<{ id: string; title: string }[]>([]);
  const warn = slugChangeWarning(wasLive, Boolean(liveSlug) && f.slug !== liveSlug && slugTouched);

  return (
    <Panel title="Post details" defaultOpen>
      <Field id="pd-slug" label="Web address" hint={`…/on-the-ranch/${f.slug || "your-post"}`}>
        <TextInput id="pd-slug" hasHint value={f.slug} maxLength={90} onChange={(e) => onSlug(e.target.value)} />
      </Field>
      {warn ? <FormMessage tone="info">{warn}</FormMessage> : null}
      <Field id="pd-excerpt" label="Summary" hint="One or two sentences for the list and sharing.">
        <TextArea id="pd-excerpt" hasHint rows={3} maxLength={300} value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
      </Field>
      <Field id="pd-author" label="Author name (optional)">
        <TextInput id="pd-author" value={f.authorName} maxLength={80} onChange={(e) => set("authorName", e.target.value)} />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={f.showAuthor} onChange={(e) => set("showAuthor", e.target.checked)} className="size-5 accent-[var(--c-primary)]" />
        Show the author on the post
      </label>
      <p className="text-sm text-ink-muted">
        {words} word{words === 1 ? "" : "s"} · about {minutes} min read
      </p>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Horses or cattle in this story</p>
        {f.animalIds.length ? (
          <ul className="flex flex-wrap gap-2">
            {f.animalIds.map((id) => (
              <li key={id} className="flex items-center gap-1 border border-rule bg-surface pl-2">
                {animalNames[id] ?? "Animal"}
                <button type="button" aria-label={`Remove ${animalNames[id] ?? "animal"}`} className="min-h-9 min-w-9" onClick={() => set("animalIds", f.animalIds.filter((x) => x !== id))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label htmlFor="pd-animal" className="sr-only">Search animals</label>
        <TextInput
          id="pd-animal"
          type="search"
          placeholder="Search by name"
          value={animalQ}
          onChange={async (e) => {
            setAnimalQ(e.target.value);
            if (e.target.value.trim().length < 2) return setAnimals([]);
            const r = await searchAnimalsAction(e.target.value);
            setAnimals(r.ok ? r.data.filter((a) => !f.animalIds.includes(a.id)) : []);
          }}
        />
        {animals.length ? (
          <ul className="border border-rule bg-white">
            {animals.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className="min-h-11 w-full px-3 text-left hover:bg-surface"
                  onClick={() => {
                    set("animalIds", [...f.animalIds, a.id]);
                    onNames({ ...animalNames, [a.id]: a.name }, titles);
                    setAnimals([]);
                    setAnimalQ("");
                  }}
                >
                  {a.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-ink-muted">The story then appears on each animal&apos;s page.</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Related stories</p>
        <p className="text-xs text-ink-muted">Shown at the bottom of the post. If you choose none, similar stories are shown.</p>
        {f.relatedIds.length ? (
          <ul className="space-y-1">
            {f.relatedIds.map((id) => (
              <li key={id} className="flex items-center justify-between gap-2 border border-rule bg-surface pl-2">
                <span className="truncate">{titles[id] ?? "Story"}</span>
                <button type="button" aria-label={`Remove ${titles[id] ?? "story"}`} className="min-h-9 min-w-9" onClick={() => set("relatedIds", f.relatedIds.filter((x) => x !== id))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label htmlFor="pd-related" className="sr-only">Search stories</label>
        <TextInput
          id="pd-related"
          type="search"
          placeholder="Search your stories"
          value={relQ}
          onChange={async (e) => {
            setRelQ(e.target.value);
            setRel(await searchRelatedAction(postId, e.target.value));
          }}
        />
        {relQ && rel.length ? (
          <ul className="border border-rule bg-white">
            {rel
              .filter((r) => !f.relatedIds.includes(r.id))
              .map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="min-h-11 w-full px-3 text-left hover:bg-surface"
                    onClick={() => {
                      if (f.relatedIds.length >= 6) return;
                      set("relatedIds", [...f.relatedIds, r.id]);
                      onNames(animalNames, { ...titles, [r.id]: r.title });
                      setRel([]);
                      setRelQ("");
                    }}
                  >
                    {r.title}
                  </button>
                </li>
              ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}

// ─── Featured image ──────────────────────────────────────────────────────────
export function FeaturedPanel({ f, set }: { f: FormState; set: Setter }) {
  return (
    <Panel title="Featured image" defaultOpen>
      {f.featuredThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.featuredThumb} alt="The featured photo" className="aspect-[3/2] w-full object-cover" />
      ) : (
        <p className="text-sm text-ink-muted">No featured photo yet. It shows on the story list, at the top of the post, and when shared.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <PhotoChooser
          label={f.featuredMediaId ? "Change photo" : "Choose a photo"}
          onChoose={(p) => {
            set("featuredMediaId", p.id);
            set("featuredThumb", p.thumb);
          }}
        />
        {f.featuredMediaId ? (
          <button
            type="button"
            className={buttonClasses("quiet", "py-2")}
            onClick={() => {
              set("featuredMediaId", null);
              set("featuredThumb", null);
            }}
          >
            Remove
          </button>
        ) : null}
      </div>
    </Panel>
  );
}

// ─── Categories & tags ───────────────────────────────────────────────────────
export function TaxonomyPanel({
  f,
  set,
  taxonomy,
  onTaxonomy,
}: {
  f: FormState;
  set: Setter;
  taxonomy: Taxonomy;
  onTaxonomy: (t: Taxonomy) => void;
}) {
  const [cat, setCat] = useState("");
  const [tag, setTag] = useState("");
  const [msg, setMsg] = useState("");
  const tagById = new Map(taxonomy.tags.map((t) => [t.id, t]));
  return (
    <Panel title="Categories & tags" defaultOpen>
      <Field id="tx-cat" label="Category">
        <Select id="tx-cat" value={f.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)}>
          <option value="">No category</option>
          {taxonomy.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex gap-2">
        <label htmlFor="tx-newcat" className="sr-only">New category</label>
        <TextInput id="tx-newcat" className="min-h-11" placeholder="New category" value={cat} maxLength={60} onChange={(e) => setCat(e.target.value)} />
        <button
          type="button"
          className={buttonClasses("secondary", "py-2")}
          onClick={async () => {
            const r = await createCategoryAction(cat);
            if (!r.ok) return setMsg(r.message);
            setMsg("");
            onTaxonomy({ ...taxonomy, categories: [...taxonomy.categories, r.data] });
            set("categoryId", r.data.id);
            setCat("");
          }}
        >
          Add
        </button>
      </div>
      {taxonomy.categories.length < 6 ? (
        <button
          type="button"
          className="text-sm text-primary underline underline-offset-4"
          onClick={async () => {
            const r = await addSuggestedCategoriesAction();
            if (!r.ok) return setMsg(r.message);
            window.location.reload();
          }}
        >
          Add suggested categories (Ranch Life, Our Horses, Our Cattle…)
        </button>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-semibold">Tags</p>
        {f.tagIds.length ? (
          <ul className="flex flex-wrap gap-2">
            {f.tagIds.map((id) => (
              <li key={id} className="flex items-center gap-1 border border-rule bg-surface pl-2">
                {tagById.get(id)?.name ?? "Tag"}
                <button type="button" aria-label={`Remove tag ${tagById.get(id)?.name ?? ""}`} className="min-h-9 min-w-9" onClick={() => set("tagIds", f.tagIds.filter((x) => x !== id))}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex gap-2">
          <label htmlFor="tx-tag" className="sr-only">Add a tag</label>
          <input
            id="tx-tag"
            list="tx-tag-list"
            value={tag}
            maxLength={40}
            placeholder="Add a tag, then press Enter"
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (!tag.trim()) return;
              const r = await createTagAction(tag);
              if (!r.ok) return setMsg(r.message);
              if (!tagById.has(r.data.id)) onTaxonomy({ ...taxonomy, tags: [...taxonomy.tags, r.data] });
              if (!f.tagIds.includes(r.data.id) && f.tagIds.length < 20) set("tagIds", [...f.tagIds, r.data.id]);
              setTag("");
              setMsg("");
            }}
            className="block min-h-11 w-full border border-rule bg-white px-3"
          />
          <datalist id="tx-tag-list">
            {taxonomy.tags.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </div>
      </div>
      <FormMessage>{msg}</FormMessage>
    </Panel>
  );
}

// ─── SEO & sharing ───────────────────────────────────────────────────────────
export function SeoPanel({ f, set, host }: { f: FormState; set: Setter; host: string }) {
  const bodyText = plainText(f.body, 600);
  const tG = titleGuidance(f.metaTitle, f.title);
  const dG = descriptionGuidance(f.metaDescription, f.excerpt || bodyText);
  const preview = searchPreview({
    host,
    path: `on-the-ranch/${f.slug || "your-post"}`,
    title: f.metaTitle || f.title,
    description: f.metaDescription || suggestDescription(f.excerpt, bodyText),
  });
  return (
    <Panel title="Search & sharing">
      <div className="space-y-1 border border-rule bg-surface p-3" aria-label="How this may look in search results">
        <p className="truncate text-xs text-ink-muted">{preview.url}</p>
        <p className="text-lg leading-snug text-[#1a0dab]">{preview.title}</p>
        <p className="text-sm text-ink-muted">{preview.description || "No description yet."}</p>
      </div>
      <Field id="seo-title" label="Search title" hint={<span className={guidanceTone[tG.tone]}>{tG.text}</span>}>
        <TextInput id="seo-title" hasHint value={f.metaTitle} maxLength={70} placeholder={suggestTitle(f.title)} onChange={(e) => set("metaTitle", e.target.value)} />
      </Field>
      <Field id="seo-desc" label="Search description" hint={<span className={guidanceTone[dG.tone]}>{dG.text}</span>}>
        <TextArea id="seo-desc" hasHint rows={3} maxLength={200} value={f.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
      </Field>
      <button type="button" className="text-sm text-primary underline underline-offset-4" onClick={() => set("metaDescription", suggestDescription(f.excerpt, bodyText))}>
        Suggest one from the summary
      </button>

      <p className="pt-2 text-sm font-semibold">When shared on social media</p>
      <Field id="og-title" label="Sharing title" hint="Leave empty to use the search title or post title.">
        <TextInput id="og-title" hasHint value={f.ogTitle} maxLength={100} onChange={(e) => set("ogTitle", e.target.value)} />
      </Field>
      <Field id="og-desc" label="Sharing description">
        <TextArea id="og-desc" rows={2} maxLength={300} value={f.ogDescription} onChange={(e) => set("ogDescription", e.target.value)} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Sharing image</p>
        {f.ogThumb || f.featuredThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(f.ogThumb ?? f.featuredThumb) as string} alt="" className="aspect-[1.91/1] w-full object-cover" />
        ) : null}
        <p className="text-xs text-ink-muted">{f.ogMediaId ? "A special photo for sharing." : "The featured photo is used unless you choose another."}</p>
        <div className="flex gap-2">
          <PhotoChooser
            label={f.ogMediaId ? "Change" : "Choose a different photo"}
            onChoose={(p) => {
              set("ogMediaId", p.id);
              set("ogThumb", p.thumb);
            }}
          />
          {f.ogMediaId ? (
            <button type="button" className={buttonClasses("quiet", "py-2")} onClick={() => { set("ogMediaId", null); set("ogThumb", null); }}>
              Use featured photo
            </button>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

// ─── History ─────────────────────────────────────────────────────────────────
export function HistoryPanel({ postId, tz, onRestored, disabled }: { postId: string; tz: string; onRestored: (r: { snapshot: PostSnapshot; version: string; thumbs: Record<string, string | null> }) => void; disabled: boolean }) {
  const [items, setItems] = useState<RevisionItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!open) return;
    let stale = false;
    void listRevisionsAction(postId).then((r) => {
      if (stale) return;
      if (r.ok) setItems(r.data as RevisionItem[]);
      else setMsg(r.message);
    });
    return () => {
      stale = true;
    };
  }, [open, postId]);
  const reasons: Record<string, string> = { save: "Saved", autosave: "Autosaved", publish: "Published", update: "Updated", restore: "Restored", duplicate: "Copied" };
  return (
    <details className="group border border-rule bg-white" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-display text-lg marker:hidden">
        Version history
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-3 border-t border-rule p-4">
        <FormMessage>{msg}</FormMessage>
        {!items && !msg ? <p className="text-sm text-ink-muted">Loading…</p> : null}
        {items && items.length === 0 ? <p className="text-sm text-ink-muted">Versions appear here as you write.</p> : null}
        <ul className="max-h-72 divide-y divide-rule overflow-y-auto">
          {items?.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span>
                <span className="block font-semibold">{reasons[r.reason] ?? r.reason}</span>
                <span className="text-ink-muted">{formatWhen(r.createdAt, tz)}</span>
              </span>
              <button
                type="button"
                disabled={disabled}
                className={clsx(buttonClasses("secondary", "py-1.5 text-sm"), disabled && "opacity-40")}
                onClick={async () => {
                  if (!window.confirm("Bring this version back into the editor? Your current text stays in the history too.")) return;
                  const res = await restoreRevisionAction(postId, r.id);
                  if (!res.ok) return setMsg(res.message);
                  onRestored(res.data as { snapshot: PostSnapshot; version: string; thumbs: Record<string, string | null> });
                }}
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-muted">Time zone: {zoneLabel(tz)}</p>
      </div>
    </details>
  );
}
