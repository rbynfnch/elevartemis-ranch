"use client";

import { useState, type ReactNode } from "react";
import { saveRanchInfoAction } from "@/lib/admin/ranch-info/actions";
import type { RanchInfoForm } from "@/lib/admin/ranch-info/service";
import { PLATFORMS, platformLabels } from "@/lib/admin/ranch-info/fields";
import { Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { RichTextEditor } from "@/components/admin/rich-text-editor";

function Section({ title, help, children }: { title: string; help?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-rule pt-8">
      <h2 className="font-display text-2xl">{title}</h2>
      {help ? <p className="max-w-[62ch] text-ink-muted">{help}</p> : null}
      {children}
    </section>
  );
}

/** The ranch's own details: the one-line tagline, the short story, how to reach it, where it is, and its links. */
export function RanchInfoEditor({ initial }: { initial: RanchInfoForm }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const set = <K extends keyof RanchInfoForm>(key: K, value: RanchInfoForm[K]) => setF((x) => ({ ...x, [key]: value }));
  const text = (key: "tagline" | "publicPhone" | "city" | "region" | "addressDisplay" | "hoursText" | "blogLabel") => ({
    value: f[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
  });

  async function save() {
    setBusy(true);
    setMessage(null);
    const r = await saveRanchInfoAction(f);
    setBusy(false);
    setMessage(r.ok ? { tone: "success", text: "Saved." } : { tone: "error", text: r.message });
  }

  return (
    <div className="space-y-10">
      <Section
        title="About the ranch"
        help="Shown on the home page and in the footer, and used as the first line search engines see."
      >
        <Field id="ri-tagline" label="Tagline" hint="One line, like what you raise and where.">
          <TextInput id="ri-tagline" maxLength={200} {...text("tagline")} hasHint />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">A short introduction</p>
          <RichTextEditor
            id="ri-intro"
            label="A short introduction"
            value={f.intro}
            onChange={(doc) => set("intro", doc)}
            minHeight="9rem"
          />
        </div>
      </Section>

      <Section
        title="Reaching you"
        help="Your phone number appears on the Contact page and can be tapped to call on a phone."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ri-phone" label="Phone number">
            <TextInput id="ri-phone" type="tel" maxLength={40} {...text("publicPhone")} />
          </Field>
          <Field id="ri-hours" label="Best times to call (optional)">
            <TextInput id="ri-hours" maxLength={200} {...text("hoursText")} />
          </Field>
          <Field id="ri-city" label="City or nearest town">
            <TextInput id="ri-city" maxLength={80} {...text("city")} />
          </Field>
          <Field id="ri-region" label="State">
            <TextInput id="ri-region" maxLength={80} {...text("region")} />
          </Field>
        </div>
        <Field
          id="ri-address"
          label="Address to show (optional)"
          hint="Many ranches show only a town and state. Leave this blank unless you want visitors to see an address."
        >
          <TextInput id="ri-address" maxLength={200} {...text("addressDisplay")} hasHint />
        </Field>
      </Section>

      <Section title="Links" help="Your pages on other sites. They appear in the footer.">
        <ul className="space-y-3">
          {f.social.map((s, i) => (
            <li key={i} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
              <div>
                <label htmlFor={`ri-plat-${i}`} className="sr-only">
                  Site
                </label>
                <select
                  id={`ri-plat-${i}`}
                  value={s.platform}
                  onChange={(e) =>
                    set(
                      "social",
                      f.social.map((x, n) => (n === i ? { ...x, platform: e.target.value as typeof s.platform } : x)),
                    )
                  }
                  className="min-h-12 w-full border border-rule bg-white px-3 text-base"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {platformLabels[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor={`ri-url-${i}`} className="sr-only">
                  Link
                </label>
                <TextInput
                  id={`ri-url-${i}`}
                  placeholder="Paste the link"
                  value={s.url}
                  maxLength={500}
                  onChange={(e) =>
                    set(
                      "social",
                      f.social.map((x, n) => (n === i ? { ...x, url: e.target.value } : x)),
                    )
                  }
                />
                {s.platform === "other" ? (
                  <>
                    <label htmlFor={`ri-label-${i}`} className="sr-only">
                      Name for this link
                    </label>
                    <TextInput
                      id={`ri-label-${i}`}
                      placeholder="A short name for it"
                      value={s.label}
                      maxLength={60}
                      onChange={(e) =>
                        set(
                          "social",
                          f.social.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)),
                        )
                      }
                    />
                  </>
                ) : null}
              </div>
              <button
                type="button"
                className={buttonClasses("quiet", "self-start py-3")}
                onClick={() =>
                  set(
                    "social",
                    f.social.filter((_, n) => n !== i),
                  )
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {f.social.length < 10 ? (
          <button
            type="button"
            className={buttonClasses("secondary", "py-2")}
            onClick={() => set("social", [...f.social, { platform: "facebook", url: "", label: "" }])}
          >
            Add a link
          </button>
        ) : null}
      </Section>

      <Section
        title="Your blog's name"
        help="What the menu and the page call your stories. Leave blank for “Happening on the Ranch”."
      >
        <Field id="ri-blog" label="Name">
          <TextInput
            id="ri-blog"
            maxLength={60}
            placeholder="Happening on the Ranch"
            className="max-w-md"
            {...text("blogLabel")}
          />
        </Field>
      </Section>

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
