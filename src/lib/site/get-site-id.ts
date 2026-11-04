import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

/** A ranch's id and name from its slug (public information). */
export async function resolveRanchBySlug(slug: string): Promise<{ id: string; name: string } | null> {
  const { data } = await createPublicClient().from("ranches").select("id, name").eq("slug", slug).maybeSingle();
  return data ? { id: data.id, name: data.name } : null;
}
