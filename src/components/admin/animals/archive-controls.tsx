"use client";

import { useActionState } from "react";
import { archiveAnimalAction, deleteForeverAction } from "@/lib/admin/animals/actions";
import { Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

export function MoveToDeletedButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={archiveAnimalAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Move ${name} to Recently Deleted? It disappears from the website, and you can restore it any time.`,
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={buttonClasses("secondary")}>
        Delete {name}
      </button>
    </form>
  );
}

export function DeleteForeverForm({ id, name }: { id: string; name: string }) {
  const [state, action] = useActionState(deleteForeverAction, {});
  return (
    <form action={action} className="space-y-3">
      <FormMessage>{state.message}</FormMessage>
      <input type="hidden" name="id" value={id} />
      <Field
        id={`confirm-${id}`}
        label={`Type “${name}” to delete permanently`}
        error={state.fieldErrors?.confirm_name}
      >
        <TextInput
          id={`confirm-${id}`}
          name="confirm_name"
          autoComplete="off"
          className="max-w-xs"
          invalid={!!state.fieldErrors?.confirm_name}
        />
      </Field>
      <button
        type="submit"
        className={buttonClasses(
          "secondary",
          "border-[#8a2b1d] text-[#8a2b1d] hover:bg-[#8a2b1d] hover:border-[#8a2b1d]",
        )}
      >
        Delete forever
      </button>
    </form>
  );
}
