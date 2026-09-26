import type { Metadata } from "next";
import { Suspense } from "react";
import { verifyEmailLink } from "@/lib/auth/actions";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Continue" };

/**
 * Landing page for invitation and password-reset emails.
 *
 * The one-time token is used only when the owner clicks Continue (a POST).
 * Corporate email security scanners "click" links with GET requests; if the
 * token were used on page load, the scanner would burn it and the owner would
 * see an "expired link" error.
 */
export default function ConfirmPage({ searchParams }: PageProps<"/admin/[ranch]/auth/confirm">) {
  return (
    <Suspense fallback={<div className="h-40" />}>
      <Confirm searchParams={searchParams} />
    </Suspense>
  );
}

async function Confirm({ searchParams }: { searchParams: PageProps<"/admin/[ranch]/auth/confirm">["searchParams"] }) {
  const params = await searchParams;
  const type = typeof params.type === "string" ? params.type : "";
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const heading = type === "invite" ? "Welcome" : type === "recovery" ? "Reset your password" : "Continue";
  const lead =
    type === "invite"
      ? "You've been invited to manage your ranch website. Continue to choose your password."
      : "Continue to choose a new password.";

  return (
    <>
      <h1 className="font-display text-3xl">{heading}</h1>
      <p className="mt-3 text-ink-muted">{lead}</p>
      <form action={verifyEmailLink} className="mt-8">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <button type="submit" className={buttonClasses("primary", "w-full")}>
          Continue
        </button>
      </form>
    </>
  );
}
