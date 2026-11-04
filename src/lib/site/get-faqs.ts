import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache/tags";
import { createPublicClient } from "@/lib/supabase/public";

export type PublicFaq = { id: string; question: string; answer: unknown; group: string | null };

/** The questions the ranch shows, in its order. */
export async function getFaqs(ranchId: string, slug: string): Promise<PublicFaq[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.ranch(slug), cacheTags.faqs(slug));
  const { data, error } = await createPublicClient()
    .from("faqs")
    .select("id, question, answer, group_label, sort_order")
    .eq("ranch_id", ranchId)
    .eq("is_published", true)
    .order("sort_order")
    .limit(200);
  if (error) throw new Error(`Loading FAQs failed: ${error.message}`);
  return (data ?? []).map((f) => ({ id: f.id, question: f.question, answer: f.answer, group: f.group_label }));
}
