"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteMemberAction, removeMemberAction, setRoleAction } from "@/lib/admin/team/actions";
import type { Member } from "@/lib/admin/team/rules";
import { Field, FormMessage, TextInput } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";

const roleWords = { owner: "Owner", editor: "Editor" } as const;

/** Who can sign in to this ranch's admin: invite someone, change what they can do, or remove them. */
export function TeamManager({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "owner">("editor");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function run(work: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    setBusy(true);
    setMessage(null);
    const r = await work();
    setBusy(false);
    if (!r.ok) return setMessage({ tone: "error", text: r.message ?? "That didn't work." });
    setMessage({ tone: "success", text: done });
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <ul className="divide-y divide-rule border-y border-rule">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {m.email}
                {m.userId === currentUserId ? (
                  <span className="ml-2 text-sm font-normal text-ink-muted">(you)</span>
                ) : null}
              </p>
              <p className="text-sm text-ink-muted">{roleWords[m.role]}</p>
            </div>
            <label className="sr-only" htmlFor={`role-${m.userId}`}>
              Role for {m.email}
            </label>
            <select
              id={`role-${m.userId}`}
              value={m.role}
              disabled={busy}
              onChange={(e) => run(() => setRoleAction(m.userId, e.target.value), "Role changed.")}
              className="min-h-11 border border-rule bg-white px-3"
            >
              <option value="editor">Editor</option>
              <option value="owner">Owner</option>
            </select>
            <button
              type="button"
              disabled={busy || m.userId === currentUserId}
              className={buttonClasses("quiet", "py-2")}
              onClick={() =>
                window.confirm(`Remove ${m.email}? They will no longer be able to sign in to this ranch's admin.`) &&
                run(() => removeMemberAction(m.userId), "Removed.")
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <section className="space-y-4" aria-labelledby="invite">
        <h2 id="invite" className="font-display text-2xl">
          Invite someone
        </h2>
        <p className="max-w-[62ch] text-ink-muted">
          They get an email with a link to choose a password. An <strong>editor</strong> can change the website&apos;s
          content. An <strong>owner</strong> can also manage the team and take the site live.
        </p>
        <div className="grid max-w-2xl gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
          <Field id="invite-email" label="Email address">
            <TextInput
              id="invite-email"
              type="email"
              value={email}
              maxLength={200}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field id="invite-role" label="Can">
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "owner")}
              className="min-h-12 w-full border border-rule bg-white px-3 text-base"
            >
              <option value="editor">Edit content</option>
              <option value="owner">Do everything</option>
            </select>
          </Field>
          <button
            type="button"
            className={buttonClasses("primary", "mb-0.5 py-3")}
            disabled={busy || !email.trim()}
            onClick={() =>
              run(async () => {
                const r = await inviteMemberAction(email, role);
                if (r.ok) setEmail("");
                return r;
              }, "Invitation sent.")
            }
          >
            Invite
          </button>
        </div>
      </section>
      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
    </div>
  );
}
