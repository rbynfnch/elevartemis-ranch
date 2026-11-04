/** Reading and saving the FAQ. Plain functions over the owner's Supabase client, so RLS applies. */
import type { Json } from "@/lib/database.types";
import { dbErrorMessage } from "@/lib/auth/messages";
import { richTextIsEmpty } from "@/lib/content/empty";
import type { Db, Result } from "@/lib/admin/animals/service";
import { tidyFaqs, type FaqInput } from "./fields";

const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (message: string): Result<never> => ({ ok: false, message });

export async function loadFaqs(db: Db, ranchId: string): Promise<Result<FaqInput[]>> {
  const { data, error } = await db
    .from("faqs")
    .select("id, question, answer, group_label, is_published, sort_order")
    .eq("ranch_id", ranchId)
    .order("sort_order")
    .limit(200);
  if (error) return fail(dbErrorMessage(error));
  return ok(
    data.map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      group: f.group_label ?? "",
      isPublished: f.is_published,
    })),
  );
}

/** Saves the whole list in the owner's order: changed ones updated, new ones added, removed ones deleted. */
export async function saveFaqs(db: Db, ranchId: string, input: FaqInput[]): Promise<Result> {
  const tidy = tidyFaqs(input, richTextIsEmpty);
  if (!tidy.ok) return fail(tidy.message);

  const { data: existing, error } = await db.from("faqs").select("id").eq("ranch_id", ranchId);
  if (error) return fail(dbErrorMessage(error));
  const keep = new Set(input.map((f) => f.id).filter((id): id is string => Boolean(id)));
  const removed = (existing ?? []).map((f) => f.id).filter((id) => !keep.has(id));
  if (removed.length) {
    const r = await db.from("faqs").delete().eq("ranch_id", ranchId).in("id", removed);
    if (r.error) return fail(dbErrorMessage(r.error));
  }
  for (const [i, f] of input.entries()) {
    const fields = { ...tidy.items[i], answer: f.answer as NonNullable<Json>, sort_order: i };
    const res = f.id
      ? await db.from("faqs").update(fields).eq("id", f.id).eq("ranch_id", ranchId)
      : await db.from("faqs").insert({ ...fields, ranch_id: ranchId });
    if (res.error) return fail(dbErrorMessage(res.error));
  }
  return ok(null);
}
