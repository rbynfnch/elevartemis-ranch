/**
 * End-to-end checks of sign-in, two-step verification and access control,
 * against a running app + Supabase (local `supabase start` + `npm run dev`/`start`).
 *
 *   npm run test:e2e:auth
 *
 * Uses the seed accounts (owner@demo.test / owner@second.test) and cleans up
 * after itself (authenticators removed, ranch settings restored).
 * Never run against production.
 */
import http from "node:http";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;
const DEMO = process.env.E2E_DEMO_ORIGIN ?? "http://demo.localhost:3000";
const SECOND = process.env.E2E_SECOND_ORIGIN ?? "http://second.localhost:3000";
const PASSWORD = "ranch-demo-2026";
const DEMO_RANCH = "a0000000-0000-4000-8000-000000000001";

if (!SUPABASE_URL || !PUBLISHABLE || !SECRET) throw new Error("Supabase env vars missing (.env.local)");
if (/supabase\.co/.test(SUPABASE_URL)) throw new Error("Refusing to run against a hosted Supabase project");

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "✔" : "✖"} ${name}${!ok && detail ? `\n    ${detail}` : ""}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
type Jar = Map<string, string>;

/** A server-style Supabase client whose cookies we can replay against the app. */
function sessionClient(jar: Jar) {
  return createServerClient(SUPABASE_URL, PUBLISHABLE, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
}

/** GET a page from the app. *.localhost connects to 127.0.0.1 with the right Host header. */
function get(url: string, jar?: Jar): Promise<{ status: number; location?: string; body: string }> {
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

/** RFC 6238 TOTP, as an authenticator app would compute it. */
function totp(secretBase32: string, offsetSteps = 0): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secretBase32.replace(/=+$/, "").toUpperCase())
    bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offsetSteps));
  const h = crypto.createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/** Wait until the next 30-second TOTP window so a fresh code is issued. */
async function nextTotpWindow() {
  await new Promise((r) => setTimeout(r, 30_000 - (Date.now() % 30_000) + 500));
}

async function signIn(email: string) {
  const jar: Jar = new Map();
  const client = sessionClient(jar);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return { jar, client };
}

const service = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  // ─── Accounts ──────────────────────────────────────────────────────────────
  const anon = createClient(SUPABASE_URL, PUBLISHABLE, { auth: { persistSession: false } });
  const signUp = await anon.auth.signUp({ email: "stranger@example.com", password: "a-long-password-1" });
  check("Public sign-up is disabled (invite-only)", Boolean(signUp.error));
  const wrong = await anon.auth.signInWithPassword({ email: "owner@demo.test", password: "not-the-password-1" });
  check("A wrong password is rejected", wrong.error?.code === "invalid_credentials", wrong.error?.code);

  // ─── Admin pages with a real session ───────────────────────────────────────
  const signedOut = await get(`${DEMO}/admin/account`);
  const loginTarget = signedOut.location ? new URL(signedOut.location, DEMO).href : "";
  check(
    "Signed-out visitors are sent to sign in on the same domain",
    signedOut.status === 307 && loginTarget === `${DEMO}/admin/login?next=%2Fadmin%2Faccount`,
    `${signedOut.status} ${signedOut.location}`,
  );

  const a = await signIn("owner@demo.test");
  const dash = await get(`${DEMO}/admin`, a.jar);
  check("Owner sees their dashboard", dash.status === 200 && dash.body.includes("Dashboard"), `status ${dash.status}`);
  check("Dashboard flags the 2025 foal", dash.body.includes("Little Juniper") && dash.body.includes("over a year old"));
  check("Dashboard flags animals without photos", dash.body.includes("no photos yet"));

  const cross = await get(`${SECOND}/admin`, a.jar);
  check(
    "An owner can't open another ranch's admin",
    cross.body.includes("have access to this ranch") &&
      !cross.body.includes("Needs your attention") &&
      !cross.body.includes("Isolation Test Stallion"),
  );
  const b = await signIn("owner@second.test");
  const crossB = await get(`${DEMO}/admin`, b.jar);
  check(
    "…in either direction, with no ranch data in the page",
    crossB.body.includes("have access to this ranch") &&
      !crossB.body.includes("Little Juniper") &&
      !crossB.body.includes("owner@demo.test"),
  );

  const aDrafts = await a.client.from("animals").select("id").eq("ranch_id", DEMO_RANCH).eq("is_published", false);
  const bDrafts = await b.client.from("animals").select("id").eq("ranch_id", DEMO_RANCH).eq("is_published", false);
  check("Owner reads their own hidden animals", (aDrafts.data?.length ?? 0) > 0);
  check("Another ranch's owner cannot", (bDrafts.data?.length ?? -1) === 0);

  // ─── Two-step verification ─────────────────────────────────────────────────
  const { data: enrolled, error: enrollError } = await a.client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "E2E authenticator",
    issuer: "E2E",
  });
  check("Owner can start two-step setup", !enrollError && Boolean(enrolled?.totp.secret), enrollError?.message);
  const secret = enrolled!.totp.secret;
  const verify1 = await a.client.auth.mfa.challengeAndVerify({ factorId: enrolled!.id, code: totp(secret) });
  check("A code from the authenticator turns it on", !verify1.error, verify1.error?.message);
  const aal = await a.client.auth.mfa.getAuthenticatorAssuranceLevel();
  check("The session is now verified (aal2)", aal.data?.currentLevel === "aal2");

  const a2 = await signIn("owner@demo.test");
  const pwOnly = await a2.client.from("animals").select("id").eq("ranch_id", DEMO_RANCH);
  check(
    "Password alone now reads NO ranch data (database-enforced)",
    (pwOnly.data?.length ?? -1) === 0,
    JSON.stringify(pwOnly.error ?? pwOnly.data?.length),
  );
  const privOnly = await a2.client.from("ranch_private").select("inquiry_email");
  check("…including the private inquiry email", (privOnly.data?.length ?? -1) === 0);
  const pwPage = await get(`${DEMO}/admin`, a2.jar);
  check(
    "…and the admin asks for the code",
    pwPage.body.includes("/admin/login/verify") && !pwPage.body.includes("Needs your attention"),
  );

  const badCode = await a2.client.auth.mfa.challengeAndVerify({ factorId: enrolled!.id, code: "000000" });
  check("A wrong code is rejected", Boolean(badCode.error), badCode.error?.code);

  console.log("  (waiting for the next 30-second code…)");
  await nextTotpWindow();
  const verify2 = await a2.client.auth.mfa.challengeAndVerify({ factorId: enrolled!.id, code: totp(secret) });
  check("The right code unlocks the session", !verify2.error, verify2.error?.message);
  const withCode = await a2.client.from("animals").select("id").eq("ranch_id", DEMO_RANCH);
  check("With the code, the owner has full access", (withCode.data?.length ?? 0) > 0);
  const codePage = await get(`${DEMO}/admin`, a2.jar);
  check(
    "…and sees the dashboard",
    codePage.body.includes("Dashboard") && codePage.body.includes("Needs your attention"),
  );

  // ─── Lost phone: Elevartemis reset (same calls as scripts/reset-mfa.ts) ────
  const { data: userList } = await service.auth.admin.listUsers();
  const ownerId = userList.users.find((u) => u.email === "owner@demo.test")!.id;
  const { data: factorList } = await service.auth.admin.mfa.listFactors({ userId: ownerId });
  for (const f of factorList?.factors ?? []) await service.auth.admin.mfa.deleteFactor({ id: f.id, userId: ownerId });
  const a3 = await signIn("owner@demo.test");
  const afterReset = await a3.client.from("animals").select("id").eq("ranch_id", DEMO_RANCH);
  check("After a reset, the password works again", (afterReset.data?.length ?? 0) > 0);

  // ─── Ranch that requires two-step verification ─────────────────────────────
  await service
    .from("ranches")
    .update({ features: { require_mfa: true } })
    .eq("id", DEMO_RANCH);
  try {
    const required = await a3.client.from("animals").select("id").eq("ranch_id", DEMO_RANCH);
    check("Required two-step blocks password-only data access", (required.data?.length ?? -1) === 0);
    const setup = await get(`${DEMO}/admin`, a3.jar);
    check(
      "…and the admin shows the setup screen first",
      setup.body.includes("Set up two-step verification") && !setup.body.includes("Needs your attention"),
    );
  } finally {
    await service.from("ranches").update({ features: {} }).eq("id", DEMO_RANCH);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
