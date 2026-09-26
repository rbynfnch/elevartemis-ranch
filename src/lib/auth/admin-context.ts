import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Species } from "@/lib/domain/species";

export type AdminRanch = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "live" | "suspended";
  role: "owner" | "editor";
  requiresMfa: boolean;
  enabledSpecies: Species[];
};

type Signed = { userId: string; email: string; hasMfa: boolean; ranch: AdminRanch };

export type AdminContext =
  | { status: "signed-out" }
  | { status: "needs-mfa" }
  | { status: "no-access"; email: string }
  | ({ status: "needs-enrollment" } & Signed)
  | ({ status: "ok" } & Signed);

/**
 * The authoritative admin check, once per request, for the ranch whose
 * domain this is (the proxy puts its slug in the route).
 *
 *  1. getUser() validates the session with Supabase Auth (never trust cookies alone).
 *  2. A user with an authenticator must have entered a code (aal2).
 *  3. The user must be a member of THIS ranch. Owners of other ranches get
 *     "no access" here, even though their password is valid.
 *  4. A ranch that requires two-step verification sends users without an
 *     authenticator to set one up before anything else.
 *
 * The database enforces 2–4 again through RLS.
 */
export const getAdminContext = cache(async (ranchSlug: string): Promise<AdminContext> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "signed-out" };

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const hasMfa = aal?.nextLevel === "aal2";
  if (hasMfa && aal?.currentLevel !== "aal2") return { status: "needs-mfa" };

  const { data: row, error } = await supabase
    .from("ranch_memberships")
    .select("role, ranches!inner ( id, slug, name, status, features, enabled_species )")
    .eq("user_id", user.id)
    .eq("ranches.slug", ranchSlug)
    .maybeSingle();
  if (error) throw new Error(`Loading your ranch failed: ${error.message}`);
  if (!row?.ranches) return { status: "no-access", email: user.email ?? "" };

  const features = (row.ranches.features ?? {}) as Record<string, unknown>;
  const ranch: AdminRanch = {
    id: row.ranches.id,
    slug: row.ranches.slug,
    name: row.ranches.name,
    status: row.ranches.status,
    role: row.role,
    requiresMfa: features.require_mfa === true || features.require_mfa === "true",
    enabledSpecies: row.ranches.enabled_species,
  };
  const signed: Signed = { userId: user.id, email: user.email ?? "", hasMfa, ranch };

  if (ranch.requiresMfa && !hasMfa) return { status: "needs-enrollment", ...signed };
  return { status: "ok", ...signed };
});

/**
 * For pages and Server Actions that need a fully authorised owner.
 * Returns null while the layout is showing another screen (no access, or
 * two-step setup).
 */
export async function requireAdmin(ranchSlug: string): Promise<Extract<AdminContext, { status: "ok" }> | null> {
  const ctx = await getAdminContext(ranchSlug);
  switch (ctx.status) {
    case "ok":
      return ctx;
    case "signed-out":
      redirect("/admin/login");
    case "needs-mfa":
      redirect("/admin/login/verify");
    default:
      return null;
  }
}
