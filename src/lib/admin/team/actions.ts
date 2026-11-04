"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as team from "./service";

const noAccess = { ok: false as const, message: "Only the ranch's owner can change the team." };

/** Owners only. Returns what the actions need, or null. */
async function owner() {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  if (!ctx || ctx.ranch.role !== "owner") return null;
  return { ranchId: ctx.ranch.id, userId: ctx.userId };
}

export async function inviteMemberAction(email: string, role: string) {
  const o = await owner();
  const r = z.enum(["owner", "editor"]).safeParse(role);
  if (!o || !r.success) return noAccess;
  const host = (await headers()).get("host");
  if (!host) return { ok: false as const, message: "Something went wrong. Try again." };
  const result = await team.inviteMember(o.ranchId, email, r.data, `https://${host}`);
  if (result.ok) revalidatePath("/admin/team");
  return result;
}

export async function removeMemberAction(userId: string) {
  const o = await owner();
  if (!o || !z.uuid().safeParse(userId).success) return noAccess;
  const result = await team.removeMember(o.ranchId, userId, o.userId);
  if (result.ok) revalidatePath("/admin/team");
  return result;
}

export async function setRoleAction(userId: string, role: string) {
  const o = await owner();
  const r = z.enum(["owner", "editor"]).safeParse(role);
  if (!o || !r.success || !z.uuid().safeParse(userId).success) return noAccess;
  const result = await team.setRole(o.ranchId, userId, r.data, o.userId);
  if (result.ok) revalidatePath("/admin/team");
  return result;
}
