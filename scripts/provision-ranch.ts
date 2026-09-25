/**
 * Provision a new ranch client (Elevartemis staff only).
 *
 *   npm run provision:ranch -- \
 *     --slug cottonwood-creek --name "Cottonwood Creek Ranch" \
 *     --domain cottonwoodcreekranch.com --domain www.cottonwoodcreekranch.com \
 *     --species horse,cattle --mark CC --subtitle Ranch \
 *     --owner-email owner@example.com --inquiry-email owner@example.com
 *
 * The first --domain is primary; others redirect to it. The owner receives an
 * invitation email to set their password (skip with --skip-invite to link an
 * existing account instead). Re-running with the same slug is refused.
 *
 * Uses SUPABASE_SECRET_KEY from .env.local — run it only from a trusted machine.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

const { values } = parseArgs({
  options: {
    slug: { type: "string" },
    name: { type: "string" },
    domain: { type: "string", multiple: true, default: [] },
    species: { type: "string", default: "horse" },
    mark: { type: "string" },
    subtitle: { type: "string" },
    "owner-email": { type: "string" },
    "inquiry-email": { type: "string" },
    "skip-invite": { type: "boolean", default: false },
    "admin-url": { type: "string" },
  },
});

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const slug = values.slug?.trim().toLowerCase();
const name = values.name?.trim();
if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail("--slug is required (lowercase letters, digits, hyphens)");
if (!name) fail("--name is required");

const species = values.species.split(",").map((s) => s.trim());
if (species.some((s) => s !== "horse" && s !== "cattle")) fail("--species must be horse, cattle or horse,cattle");

const domains = values.domain.map((d) =>
  d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, ""),
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example)");

const adminUrl = values["admin-url"] ?? `https://${process.env.NEXT_PUBLIC_ADMIN_HOST ?? "manage.elevartemis.com"}`;
const db = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data: existing } = await db.from("ranches").select("id").eq("slug", slug!).maybeSingle();
  if (existing) fail(`A ranch with slug "${slug}" already exists`);

  // 1. Ranch (settings rows are created by trigger)
  const { data: ranch, error } = await db
    .from("ranches")
    .insert({ slug: slug!, name: name!, enabled_species: species as ("horse" | "cattle")[] })
    .select("id")
    .single();
  if (error || !ranch) fail(`Creating ranch failed: ${error?.message}`);
  console.log(`✔ Ranch "${name}" created (${ranch.id}), status: draft`);

  // 2. Domains
  if (domains.length) {
    const { error: domainError } = await db
      .from("ranch_domains")
      .insert(domains.map((hostname, i) => ({ hostname, ranch_id: ranch.id, is_primary: i === 0 })));
    if (domainError) fail(`Adding domains failed: ${domainError.message}`);
    console.log(`✔ Domains: ${domains.join(", ")} (primary: ${domains[0]})`);
  }

  // 3. Branding and inquiry email
  const { error: brandError } = await db
    .from("ranch_branding")
    .update({ brand_mark: values.mark ?? null, wordmark_subtitle: values.subtitle ?? null })
    .eq("ranch_id", ranch.id);
  if (brandError) fail(`Saving branding failed: ${brandError.message}`);

  const inquiryEmail = values["inquiry-email"] ?? values["owner-email"];
  if (inquiryEmail) {
    const { error: privateError } = await db
      .from("ranch_private")
      .update({ inquiry_email: inquiryEmail })
      .eq("ranch_id", ranch.id);
    if (privateError) fail(`Saving inquiry email failed: ${privateError.message}`);
    console.log(`✔ Inquiries go to ${inquiryEmail}`);
  }

  // 4. Owner account
  const ownerEmail = values["owner-email"]?.trim().toLowerCase();
  if (ownerEmail) {
    let userId: string | undefined;
    if (!values["skip-invite"]) {
      const { data, error: inviteError } = await db.auth.admin.inviteUserByEmail(ownerEmail, {
        redirectTo: `${adminUrl}/auth/confirm`,
      });
      if (inviteError && !/already/i.test(inviteError.message)) fail(`Inviting owner failed: ${inviteError.message}`);
      userId = data?.user?.id;
      if (userId) console.log(`✔ Invitation sent to ${ownerEmail}`);
    }
    if (!userId) userId = await findUserId(ownerEmail);
    if (!userId) fail(`No account found for ${ownerEmail}`);

    const { error: memberError } = await db
      .from("ranch_memberships")
      .insert({ ranch_id: ranch.id, user_id: userId, role: "owner" });
    if (memberError) fail(`Linking owner failed: ${memberError.message}`);
    console.log(`✔ ${ownerEmail} is the owner of ${name}`);
  }

  console.log(`\nNext: set ranch_seo (description, GA4, Search Console) and switch status to "live" at launch.\n`);
}

async function findUserId(email: string): Promise<string | undefined> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Looking up ${email} failed: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) return undefined;
  }
  return undefined;
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
