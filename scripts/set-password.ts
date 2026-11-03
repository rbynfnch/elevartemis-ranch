/**
 * Set an owner's password directly (invite link failed or email is blocked).
 * Elevartemis staff only — run it from a trusted machine.
 *
 *   npm run set:password -- --email owner@example.com
 *
 * The password is typed at a hidden prompt, so it never lands in shell history
 * or on screen. Rules match the app: at least 10 characters with letters and
 * digits. The owner can change it afterwards from their account page.
 */
import { keyAwareFetch } from "../src/lib/supabase/api-key";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const { values } = parseArgs({ options: { email: { type: "string" } } });
const email = values.email?.trim().toLowerCase();
if (!email) fail("--email is required");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set");

const db = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: keyAwareFetch(secret) },
});

/** Read a line without echoing it. */
function askHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void };
    out._writeToOutput = (s: string) => {
      if (s.includes(prompt)) process.stdout.write(s);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  let userId: string | undefined;
  for (let page = 1; page <= 50 && !userId; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Looking up ${email} failed: ${error.message}`);
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (data.users.length < 200) break;
  }
  if (!userId) fail(`No account found for ${email}`);

  const password = await askHidden("New password: ");
  const again = await askHidden("Type it again: ");
  if (password !== again) fail("The two entries don't match. Nothing was changed.");
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    fail("Use at least 10 characters with letters and numbers. Nothing was changed.");

  const { error } = await db.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (error) fail(`Setting the password failed: ${error.message}`);
  console.log(`✔ Password set for ${email}. Sign in at the ranch's /admin.`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
