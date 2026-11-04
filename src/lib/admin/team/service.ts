import "server-only";
/**
 * The ranch's team: who can sign in to its admin. Email addresses live in the sign-in system, so this uses the
 * service client; every call is limited to one ranch and is reached only through owner-checked actions.
 */
import type { Result } from "@/lib/admin/animals/service";
import { createServiceSupabase } from "@/lib/supabase/service";
import { dbErrorMessage } from "@/lib/auth/messages";
import { tidyEmail, whyCannotChangeRole, whyCannotRemove, type Member } from "./rules";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export async function listTeam(ranchId: string): Promise<Result<Member[]>> {
  const admin = createServiceSupabase();
  const { data, error } = await admin
    .from("ranch_memberships")
    .select("user_id, role, created_at")
    .eq("ranch_id", ranchId)
    .order("created_at");
  if (error) return fail(dbErrorMessage(error));
  const members = await Promise.all(
    (data ?? []).map(async (m) => {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      return { userId: m.user_id, email: u.user?.email ?? "(unknown)", role: m.role as Member["role"] };
    }),
  );
  return ok(members);
}

async function findUserId(email: string): Promise<string | null> {
  const admin = createServiceSupabase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** Invites someone by email (they set a password from the link) and adds them to this ranch. */
export async function inviteMember(
  ranchId: string,
  rawEmail: string,
  role: Member["role"],
  origin: string,
): Promise<Result<{ invited: boolean }>> {
  const email = tidyEmail(rawEmail);
  if (!email) return fail("Enter a valid email address.");
  const admin = createServiceSupabase();

  let userId = await findUserId(email);
  let invited = false;
  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/admin/auth/confirm`,
    });
    if (error) return fail("We couldn't send the invitation. Check the address and try again.");
    userId = data.user?.id ?? null;
    invited = true;
  }
  if (!userId) return fail("We couldn't find or create that account.");

  const { error } = await admin.from("ranch_memberships").insert({ ranch_id: ranchId, user_id: userId, role });
  if (error) return fail(error.code === "23505" ? "That person is already on your team." : dbErrorMessage(error));
  return ok({ invited });
}

export async function removeMember(ranchId: string, userId: string, actorUserId: string): Promise<Result> {
  const team = await listTeam(ranchId);
  if (!team.ok) return team;
  const why = whyCannotRemove(team.data, userId, actorUserId);
  if (why) return fail(why);
  const { error } = await createServiceSupabase()
    .from("ranch_memberships")
    .delete()
    .eq("ranch_id", ranchId)
    .eq("user_id", userId);
  return error ? fail(dbErrorMessage(error)) : ok(null);
}

export async function setRole(
  ranchId: string,
  userId: string,
  role: Member["role"],
  actorUserId: string,
): Promise<Result> {
  const team = await listTeam(ranchId);
  if (!team.ok) return team;
  const why = whyCannotChangeRole(team.data, userId, actorUserId, role);
  if (why) return fail(why);
  const { error } = await createServiceSupabase()
    .from("ranch_memberships")
    .update({ role })
    .eq("ranch_id", ranchId)
    .eq("user_id", userId);
  return error ? fail(dbErrorMessage(error)) : ok(null);
}
