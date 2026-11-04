"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { archivePostAction, createCategoryAction, savePostAction } from "@/lib/admin/posts/actions";
import { searchAnimalsAction } from "@/lib/admin/library/actions";
import type { PostEditorData } from "@/lib/admin/posts/service";
import { metaHint, slugify } from "@/lib/admin/posts/fields";
import { Field, FormMessage, TextArea, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { collectPhotoIds } from "@/lib/content/photos";
import { PhotoPick } from "@/components/admin/banners/photo-pick";
import { PhotoChooser } from "@/components/admin/banners/photo-chooser";

function Section({ title, help, children }: { title: string; help?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-rule pt-8">
      <h2 className="font-display text-2xl">{title}</h2>
      {help ? <p className="max-w-[62ch] text-ink-muted">{help}</p> : null}
      {children}
    </section>
  );
}

/** Write a post: title, summary, the story, photos, category, date, the animals in it, and what search engines show. */
export function PostEditor({
  initial,
  ranchLabel,
  publicHref,
}: {
  initial: PostEditorData;
  ranchLabel: string;
  publicHref: string;
}) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [categories, setCategories] = useState(initial.categories);
  const [newCategory, setNewCategory] = useState("");
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "" && initial.title !== "Untitled post");
  const [busy, setBusy] = useState<"" | "saving" | "archiving">("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [animalQuery, setAnimalQuery] = useState("");
  const [animalResults, setAnimalResults] = useState<{ id: string; name: string; detail: string }[]>([]);
  const set = <K extends keyof PostEditorData>(key: K, value: PostEditorData[K]) =>
    setF((x) => ({ ...x, [key]: value }));

  async function save(status: "draft" | "published") {
    setBusy("saving");
    setMessage(null);
    const r = await savePostAction(f.id, {
      title: f.title === "Untitled post" ? "" : f.title,
      slug: f.slug,
      excerpt: f.excerpt,
      body: f.body,
      featuredMediaId: f.featured.id,
      categoryId: f.categoryId,
      status,
      publishedOn: f.publishedOn,
      metaTitle: f.metaTitle,
      metaDescription: f.metaDescription,
      focusPhrase: f.focusPhrase,
      extraMediaIds: f.extraPhotos.map((p) => p.id),
      animalIds: f.animals.map((a) => a.id),
    });
    setBusy("");
    if (!r.ok) return setMessage({ tone: "error", text: r.message });
    setF((x) => ({ ...x, status, slug: r.data.slug }));
    setMessage({
      tone: "success",
      text:
        status === "published"
          ? "Published. Your post is on the website."
          : "Saved as a draft. Visitors can't see it yet.",
    });
  }

  async function addCategory() {
    const r = await createCategoryAction(newCategory);
    if (!r.ok) return setMessage({ tone: "error", text: r.message });
    setCategories((c) => [...c, r.data]);
    set("categoryId", r.data.id);
    setNewCategory("");
  }

  async function searchAnimals(q: string) {
    setAnimalQuery(q);
    if (q.trim().length < 2) return setAnimalResults([]);
    const r = await searchAnimalsAction(q);
    setAnimalResults(r.ok ? r.data.filter((a) => !f.animals.some((x) => x.id === a.id)) : []);
  }

  async function archive() {
    if (!window.confirm("Remove this post from your list? Visitors will no longer see it.")) return;
    setBusy("archiving");
    const r = await archivePostAction(f.id);
    setBusy("");
    if (!r.ok) return setMessage({ tone: "error", text: r.message });
    router.push("/admin/updates");
  }

  const published = f.status === "published";
  return (
    <div className="space-y-10">
      <p className="text-sm">
        <Link href="/admin/updates" className="text-primary underline decoration-accent underline-offset-4">
          {ranchLabel}
        </Link>
      </p>

      <div className="space-y-5">
        <Field id="post-title" label="Title">
          <TextInput
            id="post-title"
            value={f.title === "Untitled post" ? "" : f.title}
            maxLength={160}
            placeholder="A title for your story"
            onChange={(e) => {
              const title = e.target.value;
              setF((x) => ({ ...x, title, slug: slugTouched ? x.slug : slugify(title) }));
            }}
          />
        </Field>
        <Field
          id="post-excerpt"
          label="Summary"
          hint="One or two sentences shown on the list and when the post is shared."
        >
          <TextArea
            id="post-excerpt"
            rows={2}
            maxLength={300}
            value={f.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            hasHint
          />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Story</p>
          <RichTextEditor
            id="post-body"
            label="Story"
            value={f.body}
            onChange={(body) => set("body", body)}
            minHeight="20rem"
            allowPhotos
            allowHtml
          />
          <p className="text-sm text-ink-muted" aria-live="polite">
            {collectPhotoIds(f.body).length === 0
              ? "No photos placed in the story yet. Use the Photo button in the toolbar."
              : `${collectPhotoIds(f.body).length} ${collectPhotoIds(f.body).length === 1 ? "photo" : "photos"} placed in the story. Save or publish to put ${collectPhotoIds(f.body).length === 1 ? "it" : "them"} on the website.`}
          </p>
        </div>
      </div>

      <Section title="Photos" help="The main photo goes at the top and on the list. Add more to show under the story.">
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <PhotoPick label="Main photo" photo={f.featured} onChange={(featured) => set("featured", featured)} />
          <div className="space-y-2">
            <p className="text-sm font-semibold">More photos</p>
            <ul className="flex flex-wrap gap-3">
              {f.extraPhotos.map((p) => (
                <li key={p.id} className="space-y-1">
                  {p.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt="" className="aspect-[4/3] w-32 border border-rule object-cover" />
                  ) : (
                    <span className="block aspect-[4/3] w-32 bg-surface" />
                  )}
                  <button
                    type="button"
                    className="text-sm text-primary underline underline-offset-4"
                    onClick={() =>
                      set(
                        "extraPhotos",
                        f.extraPhotos.filter((x) => x.id !== p.id),
                      )
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <PhotoChooser
              label="Add a photo"
              onChoose={(p) => !f.extraPhotos.some((x) => x.id === p.id) && set("extraPhotos", [...f.extraPhotos, p])}
            />
          </div>
        </div>
      </Section>

      <Section title="Details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="post-category" label="Category">
            <select
              id="post-category"
              value={f.categoryId ?? ""}
              onChange={(e) => set("categoryId", e.target.value || null)}
              className="min-h-12 w-full border border-rule bg-white px-3 text-base"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <Field id="post-newcat" label="Or a new category">
              <TextInput
                id="post-newcat"
                value={newCategory}
                maxLength={60}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </Field>
            <button
              type="button"
              className={buttonClasses("secondary", "mb-0.5 py-3")}
              onClick={addCategory}
              disabled={!newCategory.trim()}
            >
              Add
            </button>
          </div>
          <Field id="post-date" label="Date" hint="Change it to put an older story in its place in your history.">
            <TextInput
              id="post-date"
              type="date"
              value={f.publishedOn}
              onChange={(e) => set("publishedOn", e.target.value)}
              hasHint
            />
          </Field>
          <Field id="post-slug" label="Web address" hint={`…/on-the-ranch/${f.slug || "your-title"}`}>
            <TextInput
              id="post-slug"
              value={f.slug}
              maxLength={90}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              hasHint
            />
          </Field>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Animals in this story</p>
          <p className="text-sm text-ink-muted">Each one appears under the post, linking to its page.</p>
          <ul className="flex flex-wrap gap-2">
            {f.animals.map((a) => (
              <li key={a.id} className="inline-flex items-center gap-2 border border-rule bg-white px-3 py-1.5 text-sm">
                {a.name}
                <button
                  type="button"
                  aria-label={`Remove ${a.name}`}
                  className="font-semibold"
                  onClick={() =>
                    set(
                      "animals",
                      f.animals.filter((x) => x.id !== a.id),
                    )
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <TextInput
            id="post-animal-search"
            value={animalQuery}
            placeholder="Search your animals by name"
            autoComplete="off"
            onChange={(e) => searchAnimals(e.target.value)}
            className="max-w-md"
          />
          {animalResults.length > 0 ? (
            <ul className="max-w-md divide-y divide-rule border border-rule bg-white">
              {animalResults.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between px-3 text-left hover:bg-surface"
                    onClick={() => {
                      set("animals", [...f.animals, { id: a.id, name: a.name }]);
                      setAnimalQuery("");
                      setAnimalResults([]);
                    }}
                  >
                    <span>{a.name}</span>
                    <span className="text-sm text-ink-muted">{a.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Section>

      <Section
        title="Search engines"
        help="What Google and other search engines show for this post. Leave blank and we use the title and summary."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <Field id="post-meta-title" label="Search title" hint={metaHint("title", f.metaTitle)}>
            <TextInput
              id="post-meta-title"
              value={f.metaTitle}
              maxLength={70}
              onChange={(e) => set("metaTitle", e.target.value)}
              hasHint
            />
          </Field>
          <Field
            id="post-focus"
            label="Focus phrase"
            hint="What someone would search for to find this, like “branding day on a Wyoming ranch”. It guides your writing; visitors don't see it."
          >
            <TextInput
              id="post-focus"
              value={f.focusPhrase}
              maxLength={80}
              onChange={(e) => set("focusPhrase", e.target.value)}
              hasHint
            />
          </Field>
        </div>
        <Field id="post-meta-desc" label="Search description" hint={metaHint("description", f.metaDescription)}>
          <TextArea
            id="post-meta-desc"
            rows={3}
            maxLength={200}
            value={f.metaDescription}
            onChange={(e) => set("metaDescription", e.target.value)}
            hasHint
          />
        </Field>
        {f.focusPhrase.trim() ? (
          <FocusCheck
            phrase={f.focusPhrase}
            title={f.title}
            body={f.body}
            excerpt={f.excerpt}
            description={f.metaDescription}
          />
        ) : null}
      </Section>

      <div className="sticky bottom-0 z-20 -mx-[var(--gutter)] border-t border-rule bg-paper/95 px-[var(--gutter)] py-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={buttonClasses("primary", "min-w-36")}
            disabled={busy !== ""}
            onClick={() => save("published")}
          >
            {busy === "saving" ? "Saving…" : published ? "Save and keep published" : "Publish"}
          </button>
          <button
            type="button"
            className={buttonClasses("secondary")}
            disabled={busy !== ""}
            onClick={() => save("draft")}
          >
            {published ? "Unpublish (back to draft)" : "Save draft"}
          </button>
          {published ? (
            <a
              href={publicHref}
              target="_blank"
              rel="noopener"
              className="text-sm font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
            >
              View on website<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
          <button type="button" className={buttonClasses("quiet")} disabled={busy !== ""} onClick={archive}>
            Remove post
          </button>
          {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
        </div>
      </div>
    </div>
  );
}

import { plainSummary } from "@/lib/animals/portfolio";

/** Whether the focus phrase appears where search engines and readers look first. */
function FocusCheck({
  phrase,
  title,
  body,
  excerpt,
  description,
}: {
  phrase: string;
  title: string;
  body: unknown;
  excerpt: string;
  description: string;
}) {
  const p = phrase.trim().toLowerCase();
  const has = (text: string | null | undefined) => (text ?? "").toLowerCase().includes(p);
  const checks: [string, boolean][] = [
    ["In the title", has(title)],
    ["In the search description", has(description || excerpt)],
    ["In the first paragraph of the story", has(plainSummary(body, 300))],
  ];
  return (
    <ul className="space-y-1 text-sm" aria-label="Focus phrase check">
      {checks.map(([label, yes]) => (
        <li key={label} className={yes ? "text-primary" : "text-ink-muted"}>
          {yes ? "✓" : "○"} {label}
        </li>
      ))}
    </ul>
  );
}
