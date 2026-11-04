"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitInquiryAction, type InquiryState } from "@/lib/contact/actions";
import { LIMITS } from "@/lib/contact/inquiry";

const control =
  "block min-h-12 w-full rounded-[2px] border border-[color-mix(in_oklab,var(--c-rule)_70%,var(--c-ink-muted))] bg-white px-3.5 text-base text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

function Err({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1 text-sm font-semibold text-[#8a2b1d]">
      {message}
    </p>
  ) : null;
}

/**
 * The Contact page's form. A visitor sees only the real fields; a hidden box and the time the form was
 * opened help the server tell people from scripts.
 */
export function ContactForm({
  topics,
  defaultTopic,
  animalSlug,
}: {
  topics: string[];
  defaultTopic: string;
  animalSlug: string;
}) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiryAction, {});
  const opened = useRef<HTMLInputElement>(null);
  const errors = state.fieldErrors ?? {};

  // Stamped in the browser once the page is showing (not while it is being built on the server).
  useEffect(() => {
    if (opened.current) opened.current.value = String(Date.now());
  }, []);

  if (state.ok) {
    return (
      <div role="status" className="space-y-2 py-6">
        <p className="font-display text-2xl">Thank you.</p>
        <p className="text-ink-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-4">
      <input ref={opened} type="hidden" name="startedAt" defaultValue="0" />
      <input type="hidden" name="animal" value={animalSlug} />
      {/* People never see this box; scripts tend to fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="sr-only">
            Your name
          </label>
          <input
            id="c-name"
            name="name"
            placeholder="Your Name *"
            autoComplete="name"
            maxLength={LIMITS.name}
            required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "c-name-error" : undefined}
            className={control}
          />
          <Err id="c-name-error" message={errors.name} />
        </div>
        <div>
          <label htmlFor="c-email" className="sr-only">
            Your email address
          </label>
          <input
            id="c-email"
            name="email"
            type="email"
            placeholder="Email Address *"
            autoComplete="email"
            maxLength={LIMITS.email}
            required
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "c-email-error" : undefined}
            className={control}
          />
          <Err id="c-email-error" message={errors.email} />
        </div>
      </div>

      <div className="relative">
        <label htmlFor="c-topic" className="sr-only">
          What you&apos;re interested in
        </label>
        <select id="c-topic" name="topic" defaultValue={defaultTopic} className={`${control} appearance-none pr-10`}>
          <option value="">I&apos;m interested in…</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 16 16"
          className="pointer-events-none absolute right-3.5 top-1/2 size-3.5 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="m3 6 5 5 5-5" />
        </svg>
      </div>

      <div>
        <label htmlFor="c-message" className="sr-only">
          Your message
        </label>
        <textarea
          id="c-message"
          name="message"
          rows={5}
          placeholder="Your Message *"
          maxLength={LIMITS.message}
          required
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "c-message-error" : undefined}
          className={`${control} py-3`}
        />
        <Err id="c-message-error" message={errors.message} />
      </div>

      {state.message && !state.ok ? (
        <p role="alert" className="border-l-2 border-[#8a2b1d] bg-[#8a2b1d]/5 px-3 py-2 text-sm">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-14 w-full items-center justify-center gap-3 bg-primary px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.22em] text-on-primary hover:bg-[color-mix(in_oklab,var(--c-primary)_80%,white)] disabled:opacity-70"
      >
        {pending ? "Sending…" : "Send message"}
        <svg
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M2 8h11M9 4l4 4-4 4" />
        </svg>
      </button>
    </form>
  );
}
