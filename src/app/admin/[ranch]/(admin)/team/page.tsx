import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/admin-context";
import { listTeam } from "@/lib/admin/team/service";
import { TeamManager } from "@/components/admin/team/team-manager";
import { FormMessage } from "@/components/admin/forms";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage({ params }: PageProps<"/admin/[ranch]/team">) {
  return (
    <Suspense fallback={null}>
      <Team params={params} />
    </Suspense>
  );
}

async function Team({ params }: { params: PageProps<"/admin/[ranch]/team">["params"] }) {
  const ctx = await requireAdmin((await params).ranch);
  if (!ctx) return null;
  if (ctx.ranch.role !== "owner")
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">Team</h1>
        <p className="max-w-[62ch] text-ink-muted">Only the ranch&apos;s owner can see and change who has access.</p>
      </div>
    );
  const result = await listTeam(ctx.ranch.id);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Team</h1>
      {result.ok ? (
        <TeamManager members={result.data} currentUserId={ctx.userId} />
      ) : (
        <FormMessage>{result.message}</FormMessage>
      )}
    </div>
  );
}
