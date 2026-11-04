/** Reading and managing the messages visitors send. Plain functions over the owner's Supabase client, so RLS applies. */
import { dbErrorMessage } from "@/lib/auth/messages";
import type { Db, Result } from "@/lib/admin/animals/service";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export type InquiryStatus = "new" | "read" | "archived";

export type InquiryItem = {
  id: string;
  name: string;
  email: string;
  topic: string | null;
  animalId: string | null;
  animalName: string | null;
  message: string;
  status: InquiryStatus;
  emailed: boolean;
  createdAt: string;
};

export async function listInquiries(
  db: Db,
  ranchId: string,
  view: "inbox" | "archived",
): Promise<Result<InquiryItem[]>> {
  let query = db
    .from("inquiries")
    .select("id, name, email, topic, animal_id, animal_name, message, status, emailed_at, created_at")
    .eq("ranch_id", ranchId)
    .order("created_at", { ascending: false })
    .limit(300);
  query = view === "archived" ? query.eq("status", "archived") : query.neq("status", "archived");
  const { data, error } = await query;
  if (error) return fail(dbErrorMessage(error));
  return ok(
    (data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      topic: m.topic,
      animalId: m.animal_id,
      animalName: m.animal_name,
      message: m.message,
      status: m.status as InquiryStatus,
      emailed: Boolean(m.emailed_at),
      createdAt: m.created_at,
    })),
  );
}

/** How many messages are waiting to be read (for the menu). Zero when it can't be counted. */
export async function countNewInquiries(db: Db, ranchId: string): Promise<number> {
  const { count } = await db
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("ranch_id", ranchId)
    .eq("status", "new");
  return count ?? 0;
}

export async function setInquiryStatus(db: Db, ranchId: string, id: string, status: InquiryStatus): Promise<Result> {
  const { data, error } = await db
    .from("inquiries")
    .update({ status })
    .eq("id", id)
    .eq("ranch_id", ranchId)
    .select("id");
  if (error) return fail(dbErrorMessage(error));
  return data?.length ? ok(null) : fail("That message could not be found. Refresh the page.");
}

export async function deleteInquiry(db: Db, ranchId: string, id: string): Promise<Result> {
  const { data, error } = await db.from("inquiries").delete().eq("id", id).eq("ranch_id", ranchId).select("id");
  if (error) return fail(dbErrorMessage(error));
  return data?.length ? ok(null) : fail("That message could not be found. Refresh the page.");
}
