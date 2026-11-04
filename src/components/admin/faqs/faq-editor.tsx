"use client";

import { useState } from "react";
import { saveFaqsAction } from "@/lib/admin/faqs/actions";
import type { FaqInput } from "@/lib/admin/faqs/fields";
import { Checkbox, Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { RichTextEditor } from "@/components/admin/rich-text-editor";

type Row = FaqInput & { key: string };
let counter = 0;
const withKey = (f: FaqInput): Row => ({ ...f, key: f.id ?? `new-${++counter}` });

/** The questions visitors ask, with your answers. Each can be turned off without losing it. */
export function FaqEditor({ initial }: { initial: FaqInput[] }) {
  const [rows, setRows] = useState<Row[]>(() => initial.map(withKey));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const patch = (key: string, p: Partial<FaqInput>) =>
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const move = (i: number, by: -1 | 1) =>
    setRows((r) => {
      const j = i + by;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  async function save() {
    setBusy(true);
    setMessage(null);
    const r = await saveFaqsAction(rows.map(({ key: _k, ...f }) => (void _k, f)));
    setBusy(false);
    setMessage(
      r.ok
        ? { tone: "success", text: "Saved. Reload this page before adding more, so new questions are kept in order." }
        : { tone: "error", text: r.message },
    );
  }

  return (
    <div className="space-y-8">
      <p className="max-w-[62ch] text-ink-muted">
        The questions buyers and neighbors ask most, answered in your own words. They appear on your FAQ page, and
        search engines and AI assistants read them too, so be clear and specific.
      </p>
      {rows.length === 0 ? <p className="text-ink-muted">No questions yet.</p> : null}
      <ol className="space-y-5">
        {rows.map((f, i) => (
          <li key={f.key} className="space-y-4 border border-rule bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl">Question {i + 1}</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonClasses("quiet", "py-2")}
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className={buttonClasses("quiet", "py-2")}
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className={buttonClasses("quiet", "py-2")}
                  onClick={() =>
                    window.confirm("Remove this question?") && setRows((r) => r.filter((x) => x.key !== f.key))
                  }
                >
                  Remove
                </button>
              </div>
            </div>
            <Field id={`faq-q-${f.key}`} label="Question">
              <TextInput
                id={`faq-q-${f.key}`}
                maxLength={300}
                value={f.question}
                onChange={(e) => patch(f.key, { question: e.target.value })}
              />
            </Field>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">Answer</p>
              <RichTextEditor
                id={`faq-a-${f.key}`}
                label={`Answer to question ${i + 1}`}
                value={f.answer}
                onChange={(doc) => patch(f.key, { answer: doc })}
                minHeight="7rem"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id={`faq-g-${f.key}`}
                label="Group (optional)"
                hint="Like Buying or Breeding. Questions with the same group appear together."
              >
                <TextInput
                  id={`faq-g-${f.key}`}
                  maxLength={60}
                  value={f.group}
                  onChange={(e) => patch(f.key, { group: e.target.value })}
                  hasHint
                />
              </Field>
              <Checkbox
                name={`pub-${f.key}`}
                label="Show on the website"
                checked={f.isPublished}
                onChange={(e) => patch(f.key, { isPublished: e.target.checked })}
              />
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={buttonClasses("secondary")}
        onClick={() =>
          setRows((r) => [...r, withKey({ id: null, question: "", answer: null, group: "", isPublished: true })])
        }
      >
        Add a question
      </button>
      <div className="sticky bottom-0 z-20 -mx-[var(--gutter)] border-t border-rule bg-paper/95 px-[var(--gutter)] py-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className={buttonClasses("primary", "min-w-40")} onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
        </div>
      </div>
    </div>
  );
}
