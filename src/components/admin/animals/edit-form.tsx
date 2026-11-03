"use client";

import { createContext, startTransition, useActionState, useContext, type FormEvent, type ReactNode } from "react";
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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <FieldErrors value={state.fieldErrors ?? {}}>
      <form onSubmit={onSubmit} noValidate className="space-y-10">
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
