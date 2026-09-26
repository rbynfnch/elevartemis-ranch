/** Shared helpers for the end-to-end scripts (local Supabase + running app only). */
import http from "node:http";
import { createServerClient } from "@supabase/ssr";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
export const SECRET = process.env.SUPABASE_SECRET_KEY!;
export const DEMO = process.env.E2E_DEMO_ORIGIN ?? "http://demo.localhost:3000";
export const SECOND = process.env.E2E_SECOND_ORIGIN ?? "http://second.localhost:3000";
export const PASSWORD = "ranch-demo-2026";
export const DEMO_RANCH = "a0000000-0000-4000-8000-000000000001";

if (!SUPABASE_URL || !PUBLISHABLE || !SECRET) throw new Error("Supabase env vars missing (.env.local)");
if (/supabase\.co/.test(SUPABASE_URL)) throw new Error("Refusing to run against a hosted Supabase project");

let passed = 0;
let failed = 0;
export function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "✔" : "✖"} ${name}${!ok && detail ? `\n    ${detail}` : ""}`);
}
export function finish() {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

export type Jar = Map<string, string>;

export function sessionClient(jar: Jar) {
  return createServerClient(SUPABASE_URL, PUBLISHABLE, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
}

export async function signIn(email: string) {
  const jar: Jar = new Map();
  const client = sessionClient(jar);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return { jar, client };
}

/** GET a page from the app. *.localhost connects to 127.0.0.1 with the right Host header. */
export function get(url: string, jar?: Jar): Promise<{ status: number; location?: string; body: string }> {
  const u = new URL(url);
  const headers: Record<string, string> = { host: u.host };
  if (jar?.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: u.hostname.endsWith(".localhost") ? "127.0.0.1" : u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, location: res.headers.location, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}
