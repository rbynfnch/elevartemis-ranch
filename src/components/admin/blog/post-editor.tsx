"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import {
  archivePostAction,
  duplicatePostAction,
  publishAction,
  saveDraftAction,
  trashPostAction,
  unpublishAction,
} from "@/lib/admin/blog/actions";
import type { EditorData, Taxonomy } from "@/lib/admin/blog/service";
import type { PostSnapshot } from "@/lib/admin/blog/snapshot";
import { publishChecks } from "@/lib/blog/checks";
import { plainText, readingMinutes, type Doc } from "@/lib/blog/content";
import { formatWhen, zoneLabel, zonedLocalToUtc, utcToZonedLocal, type PostStatus } from "@/lib/blog/schedule";
import { slugify } from "@/lib/admin/posts/fields";
import { Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { EditorSurface } from "./editor-surface";
import { DetailsPanel, FeaturedPanel, HistoryPanel, Panel, SeoPanel, TaxonomyPanel, type FormState } from "./sidebar-panels";

type Save =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "dirty" }
  | { kind: "retry"; message: string }
  | { kind: "conflict"; message: string };

const statusLabel: Record<PostStatus, string> = { draft: "Draft", scheduled: "Scheduled", published: "Published", archived: "Archived" };

function toForm(data: EditorData): FormState {
  const s = data.snapshot;
  return {
    title: s.title,
    slug: s.slug,
    excerpt: s.excerpt,
    body: s.body,
    featuredMediaId: s.featuredMediaId,
    featuredThumb: s.featuredMediaId ? (data.thumbs[s.featuredMediaId] ?? null) : null,
    categoryId: s.categoryId,
    tagIds: s.tagIds,
    authorName: s.authorName,
    showAuthor: s.showAuthor,
    publishedLocal: data.publishedLocal,
    metaTitle: s.metaTitle,
    metaDescription: s.metaDescription,
    ogTitle: s.ogTitle,
    ogDescription: s.ogDescription,
    ogMediaId: s.ogMediaId,
    ogThumb: s.ogMediaId ? (data.thumbs[s.ogMediaId] ?? null) : null,
    relatedIds: s.relatedIds,
    animalIds: s.animalIds,
  };
}

/** What gets sent to the server (previews of photos stay in the browser). */
const payload = (f: FormState) => {
  const { featuredThumb, ogThumb, ...rest } = f;
  void featuredThumb;
  void ogThumb;
  return rest;
};

export function PostEditor({
  data,
  taxonomy: initialTaxonomy,
  ranchName,
}: {
  data: EditorData;
  taxonomy: Taxonomy;
  ranchName: string;
}) {
  const host = useSyncExternalStore(
    () => () => {},
    () => window.location.host,
    () => "your-website",
  );
  const router = useRouter();
  const [f, setF] = useState<FormState>(() => toForm(data));
  const [status, setStatus] = useState<PostStatus>(data.status);
  const [hasWorkingCopy, setHasWorkingCopy] = useState(data.hasWorkingCopy);
  const [save, setSave] = useState<Save>({ kind: "idle" });
  const [msg, setMsg] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [taxonomy, setTaxonomy] = useState(initialTaxonomy);
  const [names, setNames] = useState({ animals: data.animalNames, titles: data.titles });
  const [words, setWords] = useState(() => {
    const t = plainText(data.snapshot.body);
    return t ? t.split(/\s+/).length : 0;
  });
  const [minutes, setMinutes] = useState(() => readingMinutes(data.snapshot.body));
  const [slugTouched, setSlugTouched] = useState(
    data.status !== "draft" || (Boolean(data.snapshot.slug) && data.snapshot.slug !== slugify(data.snapshot.title)),
  );
  const [editorKey, setEditorKey] = useState(0);
  const [menu, setMenu] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // The server's idea of "where we are": the version to base the next save on, and the last text it has.
  const version = useRef(data.version);
  const [initialText] = useState(() => JSON.stringify(payload(toForm(data))));
  const saved = useRef(initialText);
  const [savedText, setSavedText] = useState(initialText);
  const markSaved = (text: string) => {
    saved.current = text;
    setSavedText(text);
  };
  const latest = useRef(f);
  const inFlight = useRef(false);
  const again = useRef(false);
  const blocked = useRef(false);
  const retries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistRef = useRef<(reason: "save" | "autosave") => Promise<boolean>>(async () => false);
  const [initialBody, setInitialBody] = useState(data.snapshot.body as Doc | null);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => setF((x) => ({ ...x, [key]: value })), []);
  const dirty = JSON.stringify(payload(f)) !== savedText;

  useEffect(() => {
    latest.current = f;
  }, [f]);

  const persist = useCallback(
    async (reason: "save" | "autosave") => {
      if (blocked.current) return false;
      if (inFlight.current) {
        again.current = true;
        return false;
      }
      const sending = latest.current;
      const text = JSON.stringify(payload(sending));
      if (text === saved.current) return true;
      inFlight.current = true;
      setSave({ kind: "saving" });
      let okay = false;
      try {
        const r = await saveDraftAction(data.id, payload(sending), version.current, reason);
        if (r.ok) {
          const out = r.data as { version: string; slug: string; savedAt: string; hasWorkingCopy: boolean; status: PostStatus };
          version.current = out.version;
          markSaved(text);
          retries.current = 0;
          setHasWorkingCopy(out.hasWorkingCopy);
          // The address may have been made from the title by the database.
          if (out.slug && out.slug !== sending.slug && !sending.slug) {
            setF((x) => ({ ...x, slug: x.slug || out.slug }));
            markSaved(JSON.stringify(payload({ ...sending, slug: out.slug })));
          }
          setSave({ kind: "saved", at: out.savedAt });
          okay = true;
        } else if (/changed somewhere else/.test(r.message)) {
          blocked.current = true;
          setSave({ kind: "conflict", message: r.message });
        } else {
          setSave({ kind: "retry", message: r.message });
        }
      } catch {
        setSave({ kind: "retry", message: "Couldn't reach the server." });
      }
      inFlight.current = false;
      if (!okay && !blocked.current) {
        retries.current += 1;
        const wait = Math.min(60_000, 3000 * 2 ** retries.current);
        timer.current = setTimeout(() => void persistRef.current("autosave"), wait);
      } else if (again.current) {
        again.current = false;
        void persistRef.current("autosave");
      }
      return okay;
    },
    [data.id],
  );

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  // Autosave a couple of seconds after the last change.
  useEffect(() => {
    if (!dirty || blocked.current) return;
    if (!inFlight.current) setSave((s) => (s.kind === "saving" || s.kind === "retry" ? s : { kind: "dirty" }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist("autosave"), 2500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [f, dirty, persist]);

  // Come back online → try again; leaving with unsaved changes → ask first.
  useEffect(() => {
    const online = () => void persist("autosave");
    const leave = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(payload(latest.current)) !== saved.current || inFlight.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", leave);
    };
  }, [persist]);

  const tz = data.timeZone;
  const dateUtc = f.publishedLocal ? zonedLocalToUtc(f.publishedLocal, tz) : null;
  const inFuture = dateUtc ? Date.parse(dateUtc) > now + 30_000 : false;
  const live = status === "published" || status === "scheduled";
  const checks = useMemo(() => publishChecks(f), [f]);
  const required = checks.filter((c) => c.level === "required");
  const suggestions = checks.filter((c) => c.level === "suggest");

  async function publish() {
    if (required.length) return setMsg({ tone: "error", text: required.map((c) => c.text).join(" ") });
    if (f.publishedLocal && !dateUtc) return setMsg({ tone: "error", text: "That date and time isn't valid." });
    if (suggestions.length && !live && !window.confirm(`Before you publish:\n\n• ${suggestions.map((c) => c.text).join("\n• ")}\n\nPublish anyway?`)) return;
    if (timer.current) clearTimeout(timer.current);
    // Wait for any save in flight so the version is current.
    for (let i = 0; i < 40 && inFlight.current; i++) await new Promise((r) => setTimeout(r, 150));
    setBusy("publishing");
    const r = await publishAction(data.id, payload(f), version.current);
    setBusy("");
    if (!r.ok) {
      if (/changed somewhere else/.test(r.message)) blocked.current = true;
      return setMsg({ tone: "error", text: r.message });
    }
    const out = r.data as { version: string; slug: string; status: PostStatus; savedAt: string; dropped: number };
    version.current = out.version;
    setF((x) => ({ ...x, slug: out.slug }));
    markSaved(JSON.stringify(payload({ ...f, slug: out.slug })));
    setStatus(out.status);
    setHasWorkingCopy(false);
    setSave({ kind: "saved", at: out.savedAt });
    setMsg({
      tone: "success",
      text:
        out.status === "scheduled"
          ? `Scheduled. It will appear on your website on ${formatWhen(dateUtc ?? new Date().toISOString(), tz)}.`
          : live
            ? "Updated. The changes are on your website."
            : "Published. Your post is on the website.",
    });
    router.refresh();
  }

  async function saveNow() {
    if (timer.current) clearTimeout(timer.current);
    blocked.current = blocked.current && false;
    const ok = await persist("save");
    if (ok) setMsg({ tone: "success", text: live ? "Your changes are saved. Visitors still see the published version until you press Update." : "Draft saved." });
  }

  async function openPreview() {
    await persist("save");
    window.open(`/on-the-ranch/preview/${data.id}`, "_blank", "noopener");
  }

  const publishLabel = live ? (status === "scheduled" ? "Update schedule" : "Update") : inFuture ? "Schedule" : "Publish";
  const indicator = (() => {
    switch (save.kind) {
      case "saving":
        return "Saving…";
      case "saved":
        return `Saved ${new Date(save.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
      case "dirty":
        return "Unsaved changes";
      case "retry":
        return `Couldn't save. Trying again… (${save.message})`;
      case "conflict":
        return "Not saved: changed elsewhere";
      default:
        return hasWorkingCopy ? "Unpublished changes saved" : "All changes saved";
    }
  })();

  async function move(kind: "duplicate" | "unpublish" | "archive" | "trash") {
    setMenu(false);
    const ask = {
      duplicate: null,
      unpublish: "Take this post off your website and make it a draft?",
      archive: "Archive this post? It leaves your website and your main list but is kept.",
      trash: "Move this post to the trash? It leaves your website. If you restore it later, it comes back as a draft.",
    }[kind];
    if (ask && !window.confirm(ask)) return;
    await persist("save");
    setBusy(kind);
    const r =
      kind === "duplicate"
        ? await duplicatePostAction(data.id)
        : kind === "unpublish"
          ? await unpublishAction(data.id)
          : kind === "archive"
            ? await archivePostAction(data.id)
            : await trashPostAction(data.id);
    setBusy("");
    if (!r.ok) return setMsg({ tone: "error", text: r.message });
    if (kind === "duplicate") router.push(`/admin/updates/${(r.data as { id: string }).id}`);
    else if (kind === "unpublish") {
      setStatus("draft");
      setMsg({ tone: "success", text: "It's a draft again and no longer on your website." });
      router.refresh();
    } else router.push("/admin/updates");
  }

  function restored({ snapshot: s, version: v, thumbs }: { snapshot: PostSnapshot; version: string; thumbs: Record<string, string | null> }) {
    version.current = v;
    setInitialBody(s.body);
    setF((x) => ({
      ...x,
      ...s,
      body: s.body,
      publishedLocal: s.publishedAt ? utcToZonedLocal(s.publishedAt, tz) : "",
      featuredThumb: s.featuredMediaId ? (thumbs[s.featuredMediaId] ?? null) : null,
      ogThumb: s.ogMediaId ? (thumbs[s.ogMediaId] ?? null) : null,
    }));
    setEditorKey((k) => k + 1);
    setMsg({ tone: "info", text: "That version is back in the editor. Press Save or Publish when you're happy with it." });
    // The restored text is already stored; this lets autosave confirm it.
    markSaved("");
  }

  return (
    <div className="space-y-4">
      <header className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center gap-3 border-b border-rule bg-paper/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <Link href="/admin/updates" className="text-sm text-primary underline decoration-accent underline-offset-4">
          ← All posts
        </Link>
        <span
          className={clsx(
            "px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em]",
            status === "published" ? "bg-primary text-on-primary" : "border border-rule text-ink-muted",
          )}
        >
          {statusLabel[status]}
          {hasWorkingCopy ? " · edits waiting" : ""}
        </span>
        <p role="status" aria-live="polite" className={clsx("text-sm", save.kind === "retry" || save.kind === "conflict" ? "font-semibold text-[#8a2b1d]" : "text-ink-muted")}>
          {indicator}
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" className={buttonClasses("secondary", "py-2")} onClick={openPreview}>
            Preview
          </button>
          <button type="button" className={buttonClasses("secondary", "py-2")} onClick={saveNow} disabled={!dirty || busy !== ""}>
            {live ? "Save changes" : "Save draft"}
          </button>
          <button type="button" className={buttonClasses("primary", "py-2")} onClick={publish} disabled={busy !== ""}>
            {busy === "publishing" ? "Working…" : publishLabel}
          </button>
          <div className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={menu} aria-label="More actions" className={buttonClasses("quiet", "py-2")} onClick={() => setMenu((m) => !m)}>
              ⋯
            </button>
            {menu ? (
              <ul role="menu" className="absolute right-0 z-40 mt-1 w-56 border border-rule bg-white py-1 shadow-md">
                {(
                  [
                    ["duplicate", "Make a copy"],
                    ...(live ? [["unpublish", "Take off the website"]] : []),
                    ["archive", "Archive"],
                    ["trash", "Move to trash"],
                  ] as ["duplicate" | "unpublish" | "archive" | "trash", string][]
                ).map(([k, label]) => (
                  <li key={k} role="none">
                    <button role="menuitem" type="button" className="block min-h-11 w-full px-3 text-left hover:bg-surface" onClick={() => void move(k)}>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </header>

      {save.kind === "conflict" ? (
        <FormMessage>
          {save.message}{" "}
          <button type="button" className="underline" onClick={() => window.location.reload()}>
            Reload now
          </button>
        </FormMessage>
      ) : null}
      {msg ? <FormMessage tone={msg.tone}>{msg.text}</FormMessage> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Field id="post-title" label="Title">
            <TextInput
              id="post-title"
              value={f.title}
              maxLength={160}
              placeholder="A title for your story"
              className="font-display text-2xl"
              onChange={(e) => {
                const title = e.target.value;
                setF((x) => ({ ...x, title, slug: slugTouched ? x.slug : slugify(title) }));
              }}
            />
          </Field>
          <EditorSurface
            key={editorKey}
            initial={initialBody}
            onChange={(doc) => set("body", doc)}
            onWords={(w, m) => {
              setWords(w);
              setMinutes(m);
            }}
          />
        </div>

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto" aria-label="Post settings">
          <Panel title="Publishing" defaultOpen>
            <Field
              id="pub-date"
              label="Post date and time"
              hint={`Leave empty to use the moment you publish. Choose a future time to schedule it, or a past date for an older story. Time zone: ${zoneLabel(tz)}.`}
            >
              <input
                id="pub-date"
                type="datetime-local"
                value={f.publishedLocal}
                onChange={(e) => set("publishedLocal", e.target.value)}
                aria-describedby="pub-date-hint"
                className="block min-h-12 w-full border border-rule bg-white px-3"
              />
            </Field>
            {f.publishedLocal ? (
              <button type="button" className="text-sm text-primary underline underline-offset-4" onClick={() => set("publishedLocal", "")}>
                Clear the date
              </button>
            ) : null}
            {inFuture && dateUtc ? <FormMessage tone="info">It will appear on {formatWhen(dateUtc, tz)}.</FormMessage> : null}
            {hasWorkingCopy ? <FormMessage tone="info">You have saved edits that visitors can&apos;t see yet. Press Update to put them on your website.</FormMessage> : null}
            {checks.length ? (
              <div>
                <p className="text-sm font-semibold">Before you publish</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                  {checks.map((c) => (
                    <li key={c.text} className={c.level === "required" ? "font-semibold text-[#8a2b1d]" : undefined}>
                      {c.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-primary">Everything looks ready.</p>
            )}
          </Panel>
          <DetailsPanel
            f={f}
            set={set}
            postId={data.id}
            wasLive={data.wasLive}
            liveSlug={data.liveSlug}
            slugTouched={slugTouched}
            onSlug={(v) => {
              setSlugTouched(true);
              set("slug", v);
            }}
            words={words}
            minutes={minutes}
            animalNames={names.animals}
            titles={names.titles}
            onNames={(animals, titles) => setNames({ animals, titles })}
          />
          <FeaturedPanel f={f} set={set} />
          <TaxonomyPanel f={f} set={set} taxonomy={taxonomy} onTaxonomy={setTaxonomy} />
          <SeoPanel f={f} set={set} host={host} />
          <HistoryPanel postId={data.id} tz={tz} onRestored={restored} disabled={busy !== ""} />
          <p className="px-1 text-xs text-ink-muted">Writing for {ranchName}.</p>
        </aside>
      </div>
    </div>
  );
}
