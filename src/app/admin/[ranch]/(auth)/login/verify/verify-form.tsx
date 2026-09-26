"use client";

import { useState, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { authErrorMessage } from "@/lib/auth/messages";
import { Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

export function VerifyForm({ next }: { next: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\D/g, "");
    const supabase = createBrowserSupabase();

    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setError(authErrorMessage(listError));
      setPending(false);
      return;
    }
    if (factors.totp.length === 0) {
      window.location.assign(next);
      return;
    }

    // Owners may have a backup authenticator; accept a code from any of them.
    let lastError = null;
    for (const factor of factors.totp) {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (!verifyError) {
        window.location.assign(next);
        return;
      }
      lastError = verifyError;
    }
    setError(authErrorMessage(lastError));
    setPending(false);
  }

  async function useDifferentAccount() {
    await createBrowserSupabase().auth.signOut();
    // Full page load (not router.push) so the server sees the cleared session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/admin/login");
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <FormMessage>{error}</FormMessage>
      <Field
        id="code"
        label="6-digit code"
        hint="Lost your phone? Use your backup authenticator, or contact Elevartemis."
      >
        <TextInput
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          required
          autoFocus
          hasHint
          className="font-sans text-2xl tracking-[0.3em]"
        />
      </Field>
      <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
        {pending ? "Checking…" : "Continue"}
      </button>
      <button type="button" onClick={useDifferentAccount} className={buttonClasses("quiet")}>
        Sign in with a different account
      </button>
    </form>
  );
}
