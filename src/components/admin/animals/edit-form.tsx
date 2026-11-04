"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { UNSAVED_MESSAGE, formSnapshot, setUnsaved } from "@/lib/admin/unsaved-changes";
import { saveAnimalAction } from "@/lib/admin/animals/actions";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

const FieldErrors = createContext<Record<string, string>>({});

/** Problems the last Save found, keyed by field name. Sections read their own from here. */
export function useFieldErrors(): Record<string, string> {
  return useContext(FieldErrors);
}

/**
 * One form, one Save for the whole animal page. The sections inside are plain
 * fields; the bar at the bottom stays in view while the page scrolls.
 *
 * It submits through a transition instead of a plain `action`, so what the
 * owner typed stays on screen after saving instead of snapping back to the
 * values the page was loaded with.
 */
export function AnimalEditForm({ animalId, children }: { animalId: string; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(saveAnimalAction, {});
  const form = useRef<HTMLFormElement>(null);
  const baseline = useRef<string | null>(null);
  const submitted = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);

  /** Compares what the form holds now with what was last saved (or loaded). */
  function check() {
    const el = form.current;
    if (!el || baseline.current === null) return;
    const changed = formSnapshot(el) !== baseline.current;
    setDirty(changed);
    setUnsaved(changed);
  }

  useEffect(() => {
    const el = form.current;
    if (!el) return;
    // Take the starting picture once the page has settled; only changes after that count.
    const start = window.setTimeout(() => {
      baseline.current = formSnapshot(el);
    }, 400);
    // Typing, choosing, and buttons that add or remove a row all change what the form holds.
    const later = () => window.setTimeout(check, 0);
    el.addEventListener("input", later);
    el.addEventListener("change", later);
    el.addEventListener("click", later);

    // Reloading or closing the tab.
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!formSnapshotChanged()) return;
      e.preventDefault();
    };
    // Links inside the site don't reload the page, so they are asked about here.
    const onLinkClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return; // leaving the site is handled by the browser
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (formSnapshotChanged() && !window.confirm(UNSAVED_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const formSnapshotChanged = () => baseline.current !== null && formSnapshot(el) !== baseline.current;
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onLinkClick, true);
    return () => {
      window.clearTimeout(start);
      el.removeEventListener("input", later);
      el.removeEventListener("change", later);
      el.removeEventListener("click", later);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onLinkClick, true);
      setUnsaved(false);
    };
  }, []);

  // A successful save becomes the new starting point, unless the owner kept typing while it saved.
  useEffect(() => {
    if (!state.ok || pending || !form.current || submitted.current === null) return;
    if (formSnapshot(form.current) === submitted.current) {
      baseline.current = submitted.current;
      setDirty(false);
      setUnsaved(false);
    }
    submitted.current = null;
  }, [state, pending]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitted.current = formSnapshot(event.currentTarget);
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <FieldErrors value={state.fieldErrors ?? {}}>
      <form ref={form} onSubmit={onSubmit} noValidate className="space-y-10">
        <input type="hidden" name="id" value={animalId} />
        {children}
        <div className="sticky bottom-0 z-20 -mx-[var(--gutter)] border-t border-rule bg-paper/95 px-[var(--gutter)] py-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={pending}
              aria-disabled={pending}
              className={buttonClasses("primary", "min-w-40")}
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1" aria-live="polite">
              {dirty && !pending ? (
                <span className="text-sm font-semibold text-[#7a5a14]">You have unsaved changes</span>
              ) : null}
              <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
              {state.ok && state.link ? (
                <a
                  href={state.link.href}
                  target="_blank"
                  rel="noopener"
                  className="text-sm font-semibold text-primary underline decoration-accent decoration-2 underline-offset-4"
                >
                  {state.link.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </FieldErrors>
  );
}
