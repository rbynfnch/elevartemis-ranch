import { z } from "zod";

/**
 * Public configuration, safe to ship to the browser.
 *
 * Each variable is referenced as a literal `process.env.NEXT_PUBLIC_*` so
 * Next.js can inline it at build time. Validation is lazy (on first use), so a
 * missing variable fails loudly at runtime with a clear message instead of
 * breaking unrelated builds.
 */
const publicSchema = z.object({
  supabaseUrl: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL must be a URL" }),
  supabasePublishableKey: z.string().min(20, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing"),
});

export type PublicEnv = z.infer<typeof publicSchema>;

let cachedPublic: PublicEnv | undefined;

export function publicEnv(): PublicEnv {
  cachedPublic ??= publicSchema.parse({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cachedPublic;
}

type DeploymentEnv = "production" | "preview" | "development";
const deploymentEnvs: readonly DeploymentEnv[] = ["production", "preview", "development"];

/**
 * Deployment environment: APP_ENV if set explicitly (useful when running a
 * production build locally), otherwise Vercel's VERCEL_ENV, otherwise NODE_ENV.
 */
export function deploymentEnv(): DeploymentEnv {
  for (const v of [process.env.APP_ENV, process.env.VERCEL_ENV]) {
    if (deploymentEnvs.includes(v as DeploymentEnv)) return v as DeploymentEnv;
  }
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

/**
 * On preview deployments and localhost, requests from hosts that aren't in
 * ranch_domains fall back to this ranch. Never used in production.
 */
export function fallbackRanchSlug(): string | undefined {
  if (deploymentEnv() === "production") return undefined;
  return process.env.DEFAULT_RANCH_SLUG || undefined;
}
