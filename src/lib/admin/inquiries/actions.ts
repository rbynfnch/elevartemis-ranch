"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-context";
import { currentRanchSlug } from "@/lib/auth/current-ranch";
import * as inquiries from "./service";

const noAccess = { ok: false as const, message: "You don't have access to make changes here. Try signing in again." };

async function context() {
  const slug = await currentRanchSlug();
  const ctx = slug ? await requireAdmin(slug) : null;
  return ctx ? { ranchId: ctx.ranch.id, db: await createServerSupabase() } : null;
}

export async function setInquiryStatusAction(id: string, status: string) {
  const c = await context();
  const s = z.enum(["new", "read", "archived"]).safeParse(status);
  if (!c || !z.uuid().safeParse(id).success || !s.success) return noAccess;
  const result = await inquiries.setInquiryStatus(c.db, c.ranchId, id, s.data);
  if (result.ok) revalidatePath("/admin/messages");
  return result;
}

export async function deleteInquiryAction(id: string) {
  const c = await context();
  if (!c || !z.uuid().safeParse(id).success) return noAccess;
  const result = await inquiries.deleteInquiry(c.db, c.ranchId, id);
  if (result.ok) revalidatePath("/admin/messages");
  return result;
}
