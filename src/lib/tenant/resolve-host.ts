import { publicEnv, fallbackRanchSlug } from "@/lib/env";
import { isFallbackEligibleHost } from "./host";

export type ResolvedHost = {
  ranchId: string;
  ranchSlug: string;
  status: "draft" | "live" | "suspended";
  isPrimary: boolean;
  primaryHostname: string | null;
  /** True when resolved via DEFAULT_RANCH_SLUG rather than ranch_domains. */
  viaFallback: boolean;
};

type Row = {
  ranch_id: string;
  ranch_slug: string;
  ranch_status: ResolvedHost["status"];
  is_primary: boolean;
  primary_hostname: string | null;
};

const TTL_HIT_MS = 60_000;
const TTL_MISS_MS = 15_000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { value: ResolvedHost | null; expires: number }>();

async function rpc(fn: "resolve_host" | "resolve_ranch_slug", body: Record<string, string>) {
  const env = publicEnv();
  const res = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: env.supabasePublishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${fn} failed: ${res.status} ${await res.text()}`);
  const rows = (await res.json()) as Row[];
  return rows[0] ?? null;
}

function toResolved(row: Row, viaFallback: boolean): ResolvedHost {
  return {
    ranchId: row.ranch_id,
    ranchSlug: row.ranch_slug,
    status: row.ranch_status,
    isPrimary: row.is_primary,
    primaryHostname: row.primary_hostname,
    viaFallback,
  };
}

/**
 * Hostname → ranch, cached in memory per server instance (proxy runtime).
 * Unknown hosts fall back to DEFAULT_RANCH_SLUG only outside production AND
 * only for localhost / *.localhost / *.vercel.app, so previews show a ranch
 * but an unrecognised real domain never does.
 */
export async function resolveHost(hostname: string): Promise<ResolvedHost | null> {
  const now = Date.now();
  const hit = cache.get(hostname);
  if (hit && hit.expires > now) return hit.value;

  let value: ResolvedHost | null = null;
  const row = hostname ? await rpc("resolve_host", { p_hostname: hostname }) : null;
  if (row) {
    value = toResolved(row, false);
  } else {
    const slug = isFallbackEligibleHost(hostname) ? fallbackRanchSlug() : undefined;
    const fallback = slug ? await rpc("resolve_ranch_slug", { p_slug: slug }) : null;
    if (fallback) value = toResolved(fallback, true);
  }

  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(hostname, { value, expires: now + (value ? TTL_HIT_MS : TTL_MISS_MS) });
  return value;
}
