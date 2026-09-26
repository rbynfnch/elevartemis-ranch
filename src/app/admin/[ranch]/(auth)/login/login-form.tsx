"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { authErrorMessage } from "@/lib/auth/messages";
import { Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

/**
 * Signs in from the browser so Supabase's rate limits and abuse protection
 * see the owner's own IP address rather than our server's.
 */
export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [error, setError] = useState(
    linkError ? "That link has expired or was already used. Sign in, or request a new one." : "",
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const supabase = createBrowserSupabase();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    if (signInError) {
      setError(authErrorMessage(signInError));
      setPending(false);
      return;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsCode = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
    // Full navigation so the server renders with the new session cookies.
    window.location.assign(needsCode ? `/admin/login/verify?next=${encodeURIComponent(next)}` : next);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <FormMessage>{error}</FormMessage>
      <Field id="email" label="Email">
        <TextInput id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field id="password" label="Password">
        <TextInput id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm">
        <Link href="/admin/forgot-password" className="text-primary underline decoration-accent underline-offset-4">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
