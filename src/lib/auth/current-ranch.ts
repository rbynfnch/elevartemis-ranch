import "server-only";
import { headers } from "next/headers";
import { normalizeHost } from "@/lib/tenant/host";
import { resolveHost } from "@/lib/tenant/resolve-host";

/**
 * The ranch whose domain this request came in on. Server Actions use this
 * instead of trusting a ranch id sent from the browser.
 */
export async function currentRanchSlug(): Promise<string | null> {
  const host = normalizeHost((await headers()).get("host"));
  const ranch = await resolveHost(host);
  return ranch?.ranchSlug ?? null;
}
