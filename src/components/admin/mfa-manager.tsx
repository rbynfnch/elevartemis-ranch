"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Factor } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { authErrorMessage } from "@/lib/auth/messages";
import { buttonClasses } from "@/components/ui/button";
import { Field, FormMessage, TextInput } from "./forms";

type Enrolling = { id: string; qr: string; secret: string };

/**
 * Two-step verification with an authenticator app (Google Authenticator,
 * Microsoft Authenticator, 1Password, Authy…). Owners can add a second
 * authenticator as a backup in case a phone is lost.
 */
export function MfaManager({ required, issuer }: { required: boolean; issuer: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) setMessage({ tone: "error", text: authErrorMessage(error) });
    setFactors(data?.totp ?? []);
    return data;
  }, [supabase]);

  useEffect(() => {
    let active = true;
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage({ tone: "error", text: authErrorMessage(error) });
      setFactors(data?.totp ?? []);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  async function start() {
    setPending(true);
    setMessage(null);
    const data = await load();
    // Clear any half-finished setup so the new one isn't blocked.
    for (const f of data?.all ?? []) {
      if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const isBackup = (data?.totp.length ?? 0) > 0;
    const { data: enrolled, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer,
      friendlyName: `${isBackup ? "Backup authenticator" : "Authenticator app"} (${new Date().toISOString().slice(0, 16).replace("T", " ")})`,
    });
    setPending(false);
    if (error || !enrolled) {
      setMessage({ tone: "error", text: authErrorMessage(error) });
      return;
    }
    setEnrolling({ id: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrolling) return;
    setPending(true);
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\D/g, "");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.id, code });
    setPending(false);
    if (error) {
      setMessage({ tone: "error", text: authErrorMessage(error) });
      return;
    }
    setEnrolling(null);
    await load();
    setMessage({
      tone: "success",
      text: "Two-step verification is on. You'll enter a code from your app each time you sign in.",
    });
    router.refresh();
  }

  async function cancel() {
    if (enrolling) await supabase.auth.mfa.unenroll({ factorId: enrolling.id });
    setEnrolling(null);
  }

  async function remove(factor: Factor) {
    const last = (factors?.length ?? 0) <= 1;
    const warning = last
      ? "Turn off two-step verification? Your account will be protected by your password only."
      : `Remove “${factor.friendly_name ?? "this authenticator"}”?`;
    if (!window.confirm(warning)) return;
    setPending(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setPending(false);
    if (error) {
      setMessage({ tone: "error", text: authErrorMessage(error) });
      return;
    }
    await load();
    setMessage({ tone: "success", text: last ? "Two-step verification is off." : "Authenticator removed." });
    router.refresh();
  }

  if (factors === null) return <p className="text-ink-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <FormMessage tone={message?.tone}>{message?.text}</FormMessage>

      {factors.length > 0 ? (
        <ul className="divide-y divide-rule border-y border-rule">
          {factors.map((f) => {
            const locked = required && factors.length === 1;
            return (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>{f.friendly_name ?? "Authenticator app"}</span>
                {locked ? (
                  <span className="text-sm text-ink-muted">Required for your ranch</span>
                ) : (
                  <button type="button" onClick={() => remove(f)} disabled={pending} className={buttonClasses("quiet")}>
                    {factors.length === 1 ? "Turn off" : "Remove"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="max-w-[60ch]">
          Add a second step to signing in: after your password, you&apos;ll enter a 6-digit code from an authenticator
          app on your phone. Someone who learns your password still can&apos;t get in.
        </p>
      )}

      {enrolling ? (
        <div className="space-y-5 border border-rule bg-white p-5">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Open an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, 1Password or
              similar).
            </li>
            <li>Add an account and scan this code.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrolling.qr}
            alt="QR code for your authenticator app"
            width={184}
            height={184}
            className="border border-rule bg-white p-2"
          />
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">Can&apos;t scan? Type this key instead</summary>
            <p className="mt-2 break-all font-mono text-base tracking-wider">
              {enrolling.secret.match(/.{1,4}/g)?.join(" ")}
            </p>
          </details>
          <form onSubmit={confirm} className="space-y-4" noValidate>
            <Field id="enroll-code" label="6-digit code">
              <TextInput
                id="enroll-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                required
                className="text-xl tracking-[0.3em]"
              />
            </Field>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={pending} className={buttonClasses("primary")}>
                {pending ? "Checking…" : "Turn on"}
              </button>
              <button type="button" onClick={cancel} className={buttonClasses("secondary")}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={pending}
          className={buttonClasses(factors.length ? "secondary" : "primary")}
        >
          {factors.length ? "Add a backup authenticator" : "Set up two-step verification"}
        </button>
      )}

      {factors.length === 1 && !enrolling ? (
        <p className="max-w-[60ch] text-sm text-ink-muted">
          Tip: add a backup authenticator on a second phone or a password manager. If you lose access to all of them,
          contact Elevartemis and we&apos;ll verify it&apos;s you before resetting it.
        </p>
      ) : null}
    </div>
  );
}
