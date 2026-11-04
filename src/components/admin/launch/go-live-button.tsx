"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { goLiveAction } from "@/lib/admin/launch/actions";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

/** The one step that opens the site to everyone and to search engines. It asks first. */
export function GoLiveButton({ disabled, isOwner }: { disabled: boolean; isOwner: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    if (
      !window.confirm(
        "Make your website live? Anyone will be able to see it, and search engines will start to list it.",
      )
    )
      return;
    setBusy(true);
    setError("");
    const r = await goLiveAction();
    setBusy(false);
    if (!r.ok) return setError(r.message);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className={buttonClasses("primary", "min-w-48")}
        disabled={disabled || busy || !isOwner}
        onClick={go}
      >
        {busy ? "Going live…" : "Go live"}
      </button>
      {!isOwner ? <p className="text-sm text-ink-muted">Only the ranch&apos;s owner can take the site live.</p> : null}
      <FormMessage>{error}</FormMessage>
    </div>
  );
}
