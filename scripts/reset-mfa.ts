/**
 * Remove every authenticator from an owner's account (lost phone).
 * Elevartemis staff only — verify the owner's identity by phone first.
 *
 *   npm run reset:mfa -- --email owner@example.com
 *
 * The owner can then sign in with their password and set up a new
 * authenticator. If their ranch REQUIRES two-step verification, they'll be
 * asked to set one up before they can manage anything.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({ options: { email: { type: "string" } } });
const email = values.email?.trim().toLowerCase();
if (!email) {
  console.error("✖ --email is required");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("✖ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  process.exit(1);
}
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  let userId: string | undefined;
  for (let page = 1; page <= 50 && !userId; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (data.users.length < 200) break;
  }
  if (!userId) throw new Error(`No account found for ${email}`);

  const { data, error } = await db.auth.admin.mfa.listFactors({ userId });
  if (error) throw error;
  if (data.factors.length === 0) {
    console.log(`${email} has no authenticators. Nothing to do.`);
    return;
  }
  for (const factor of data.factors) {
    const { error: deleteError } = await db.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
    if (deleteError) throw deleteError;
    console.log(`✔ Removed ${factor.factor_type} "${factor.friendly_name ?? factor.id}"`);
  }
  console.log(`\n${email} can now sign in with their password and set up a new authenticator.`);
}

main().catch((e) => {
  console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
