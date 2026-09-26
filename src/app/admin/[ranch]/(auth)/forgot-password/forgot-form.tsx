"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const { error: resetError } = await createBrowserSupabase().auth.resetPasswordForEmail(email);
    setPending(false);
    // Same message whether or not the account exists, so the form can't be
    // used to discover which emails have accounts.
    if (resetError && resetError.status === 429) {
      setError("We've sent several emails already. Wait a few minutes, then try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-8 space-y-5">
        <FormMessage tone="success">
          If that email belongs to an account, a reset link is on its way. It can take a few minutes — check your spam
          folder too.
        </FormMessage>
        <Link href="/login" className="text-sm text-primary underline decoration-accent underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <FormMessage>{error}</FormMessage>
      <Field id="email" label="Email">
        <TextInput id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-sm">
        <Link href="/login" className="text-primary underline decoration-accent underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
