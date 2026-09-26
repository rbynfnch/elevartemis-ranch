"use client";

import { useActionState } from "react";
import { setPassword, type FormState } from "@/lib/auth/actions";
import { passwordRules } from "@/lib/auth/password";
import { Field, FormMessage, SubmitButton, TextInput } from "./forms";

export function PasswordForm({ then, submitLabel }: { then?: "dashboard"; submitLabel: string }) {
  const [state, action] = useActionState<FormState, FormData>(setPassword, {});
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <FormMessage tone={state.ok ? "success" : "error"}>{state.message}</FormMessage>
      {then ? <input type="hidden" name="then" value={then} /> : null}
      <Field id="password" label="New password" hint={passwordRules} error={state.fieldErrors?.password}>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          hasHint
          invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>
      <Field id="confirm" label="Type it again" error={state.fieldErrors?.confirm}>
        <TextInput
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          invalid={Boolean(state.fieldErrors?.confirm)}
        />
      </Field>
      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
