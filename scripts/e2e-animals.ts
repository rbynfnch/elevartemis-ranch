/**
 * End-to-end checks of animal management, as a real signed-in owner, through
 * the same service functions the admin uses (RLS and triggers included), plus
 * the admin pages rendered with real session cookies.
 *
 *   npm run test:e2e:animals      (local Supabase + running app; never production)
 *
 * Creates its own test animals and removes them at the end. Photo uploads need
 * Supabase Storage and are exercised manually (see README).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";
import * as svc from "../src/lib/admin/animals/service";
import { breedingDisplay } from "../src/lib/animals/breeding";
import { DEMO, DEMO_RANCH, PUBLISHABLE, SUPABASE_URL, check, finish, get, signIn } from "./lib/e2e";

const doc = (text: string) => ({
  type: "doc" as const,
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});
const basics = (over: Partial<Parameters<typeof svc.createAnimal>[2]> = {}) => ({
  species: "horse" as const,
  category_id: "horse.mare",
  name: "E2E Mare",
  registered_name: null,
  sex: "female" as const,
  breed: "Appaloosa",
  color: null,
  registry: null,
  registration_number: null,
  birth_date: "2020-01-01",
  birth_precision: "year" as const,
  description: null,
  ...over,
});

async function main() {
  const { jar, client } = await signIn("owner@demo.test");
  const db = client as unknown as svc.Db;
  const anon = createClient<Database>(SUPABASE_URL, PUBLISHABLE, { auth: { persistSession: false } });
  const cleanup: string[] = [];

  // ─── Add and edit ──────────────────────────────────────────────────────────
  const created = await svc.createAnimal(db, DEMO_RANCH, basics());
  check("Owner adds an animal", created.ok, !created.ok ? created.message : "");
  const mareId = created.ok ? created.data.id : "";
  cleanup.push(mareId);
  const { data: fresh } = await client.from("animals").select("is_published, slug").eq("id", mareId).single();
  check(
    "New animals start hidden, with a web address made from the name",
    fresh?.is_published === false && fresh?.slug === "e2e-mare",
  );

  const steer = await svc.createAnimal(
    db,
    DEMO_RANCH,
    basics({ species: "cattle", category_id: "cattle.steer", name: "E2E Steer", sex: "steer" }),
  );
  check(
    "Categories this ranch doesn't use are refused, in plain words",
    !steer.ok && /isn't one of this ranch's categories/.test(steer.message),
    !steer.ok ? steer.message : "created!",
  );
  const femaleStallion = await svc.createAnimal(
    db,
    DEMO_RANCH,
    basics({ category_id: "horse.stallion", name: "Wrong" }),
  );
  check(
    "A stallion can't be female (database rule, owner-friendly message)",
    !femaleStallion.ok && /stallion can't be recorded as female/i.test(femaleStallion.message),
    !femaleStallion.ok ? femaleStallion.message : "",
  );

  const renamed = await svc.updateBasics(
    db,
    mareId,
    basics({ name: "E2E Spotted Mare", description: doc("Kind and willing.") }),
  );
  check("Owner edits the basics", renamed.ok);

  // ─── Website status and For Sale ───────────────────────────────────────────
  await svc.saveStatus(db, mareId, {
    is_published: true,
    is_featured: false,
    program_status: "active",
    deceased_on: null,
    deceased_precision: "year",
  });
  await svc.saveSale(db, DEMO_RANCH, mareId, {
    status: "available",
    price_mode: "contact",
    price_cents: null,
    available_on: null,
    location_text: null,
    sales_description: doc("Sound and ready."),
    show_on_sold_page: true,
  });
  let card = await anon.from("public_animal_cards").select("*").eq("id", mareId).single();
  check(
    "Marked For Sale → visitors see it on For Sale and in Mares",
    card.data?.on_for_sale_page === true && card.data?.on_category_page === true,
  );
  await svc.saveSale(db, DEMO_RANCH, mareId, {
    status: "sold",
    price_mode: "hidden",
    price_cents: null,
    available_on: null,
    location_text: null,
    sales_description: null,
    show_on_sold_page: true,
  });
  card = await anon.from("public_animal_cards").select("*").eq("id", mareId).single();
  const soldRow = await client.from("sale_listings").select("sold_on").eq("animal_id", mareId).single();
  check(
    "Marked Sold → off For Sale, onto Sold, portfolio kept, sale date recorded",
    card.data?.on_sold_page === true && !card.data?.on_for_sale_page && !!soldRow.data?.sold_on,
  );

  // ─── Facts and stories (atomic) ────────────────────────────────────────────
  const details = await svc.saveDetails(db, mareId, {
    facts: [
      { label: "Discipline", value: "Barrel racing" },
      { label: "Height", value: "15 hh" },
    ],
    sections: [{ heading: "Show record", body: doc("[Placeholder]") }],
  });
  check("Owner saves Quick Facts and a story", details.ok);
  const badDetails = await svc.saveDetails(db, mareId, { facts: [{ label: "Height", value: " " }], sections: [] });
  const factsAfter = await anon.from("animal_facts").select("label").eq("animal_id", mareId);
  check("A bad save changes nothing (facts kept)", !badDetails.ok && factsAfter.data?.length === 2);

  // ─── Breeding Services ─────────────────────────────────────────────────────
  const breedingRow = {
    status: "available" as const,
    stud_fee_cents: 150000,
    booking_fee_cents: null,
    collection_fee_cents: null,
    breeding_season: null,
    service_types: ["cooled", "frozen"],
    service_type_other: null,
    shipping_info: null,
    female_requirements: null,
    live_offspring_guarantee: null,
    live_offspring_guarantee_terms: null,
    contract_url: null,
    additional_terms: null,
    cta_label: null,
    cta_url: null,
  };
  const mareBreeding = await svc.saveBreeding(db, DEMO_RANCH, mareId, { breeding_available: true, row: breedingRow });
  check(
    "Breeding services are refused for a mare",
    !mareBreeding.ok && /stallions or bulls/.test(mareBreeding.message),
    !mareBreeding.ok ? mareBreeding.message : "",
  );
  const stud = await svc.createAnimal(
    db,
    DEMO_RANCH,
    basics({ category_id: "horse.stallion", name: "E2E Stud", sex: "male" }),
  );
  const studId = stud.ok ? stud.data.id : "";
  cleanup.push(studId);
  await svc.saveStatus(db, studId, {
    is_published: true,
    is_featured: false,
    program_status: "active",
    deceased_on: null,
    deceased_precision: "year",
  });
  const studBreeding = await svc.saveBreeding(db, DEMO_RANCH, studId, { breeding_available: true, row: breedingRow });
  const pub = await anon.from("breeding_services").select("*").eq("animal_id", studId).single();
  const display = pub.data ? breedingDisplay("horse", true, pub.data) : null;
  check(
    "A stallion's Breeding Services reach the public page, showing only what's filled in",
    studBreeding.ok &&
      display?.badge === "Standing at Stud" &&
      JSON.stringify(display?.facts) ===
        JSON.stringify([
          { label: "Stud fee", value: "$1,500" },
          { label: "Available as", value: "Cooled semen, Frozen semen" },
        ]),
    JSON.stringify(display),
  );
  await svc.saveBreeding(db, DEMO_RANCH, studId, { breeding_available: false, row: breedingRow });
  const kept = await client.from("breeding_services").select("stud_fee_cents").eq("animal_id", studId).single();
  check("Turning breeding off hides it but keeps the details", kept.data?.stud_fee_cents === 150000);

  // ─── Cattle performance ────────────────────────────────────────────────────
  const bullId = "c2000000-0000-4000-8000-000000000010";
  const perf = await svc.savePerformance(db, DEMO_RANCH, bullId, {
    birth_weight_lb: 78,
    weaning_weight_lb: null,
    weaning_weight_adj_lb: 645,
    yearling_weight_lb: null,
    yearling_weight_adj_lb: null,
    adg_lb: 3.4,
    adg_note: "on test",
    epds: [{ trait: "BW", value: 1.2 }],
    epds_as_of: "2026-09-01",
    epds_source: null,
  });
  check("Owner records a Hereford's weights and EPDs", perf.ok, !perf.ok ? perf.message : "");
  const horsePerf = await svc.savePerformance(db, DEMO_RANCH, studId, {
    birth_weight_lb: 80,
    weaning_weight_lb: null,
    weaning_weight_adj_lb: null,
    yearling_weight_lb: null,
    yearling_weight_adj_lb: null,
    adg_lb: null,
    adg_note: null,
    epds: [],
    epds_as_of: null,
    epds_source: null,
  });
  check("…but not for a horse", !horsePerf.ok);
  await svc.savePerformance(db, DEMO_RANCH, bullId, null);

  // ─── The owner's call on reclassification ──────────────────────────────────
  const juniper = "c1000000-0000-4000-8000-000000000018";
  const before = await get(`${DEMO}/admin`, jar);
  await svc.keepCategory(db, juniper);
  const after = await get(`${DEMO}/admin`, jar);
  check(
    "“Keep as Foal” silences the dashboard suggestion",
    before.body.includes("Little Juniper") && !after.body.includes("Little Juniper is over"),
  );
  await client.from("animals").update({ category_confirmed_at: null }).eq("id", juniper);

  // ─── Admin pages ───────────────────────────────────────────────────────────
  const list = await get(`${DEMO}/admin/animals`, jar);
  check(
    "The animal list shows the ranch's animals",
    list.status === 200 && list.body.includes("Juniper Blue") && list.body.includes("E2E Spotted Mare"),
  );
  check("…and never another ranch's", !list.body.includes("Isolation Test Stallion"));
  const hidden = await get(`${DEMO}/admin/animals?show=hidden`, jar);
  check(
    "The Hidden filter works",
    hidden.body.includes("Unpublished Example") && !hidden.body.includes("Juniper Blue"),
  );
  const addPage = await get(`${DEMO}/admin/animals/new`, jar);
  check(
    "Add Animal offers this ranch's categories (Bulls, Yearlings, Cows; no Steers)",
    addPage.body.includes("Yearling") && !addPage.body.includes(">Steer<"),
  );
  const bullPage = await get(`${DEMO}/admin/animals/${bullId}`, jar);
  check(
    "A bull's editor has Breeding Services and Performance",
    bullPage.body.includes("Breeding Services") &&
      bullPage.body.includes("Performance") &&
      bullPage.body.includes("EPDs"),
  );
  const marePage = await get(`${DEMO}/admin/animals/${mareId}`, jar);
  check(
    "A mare's editor has neither",
    marePage.status === 200 && !marePage.body.includes("Breeding Services") && !marePage.body.includes("EPDs"),
  );

  // ─── Recently Deleted ──────────────────────────────────────────────────────
  const archived = await svc.archiveAnimal(db, mareId);
  const gone = await anon.from("animals").select("id").eq("id", mareId);
  const deletedPage = await get(`${DEMO}/admin/recently-deleted`, jar);
  check(
    "Delete → gone from the website, waiting in Recently Deleted",
    archived.ok && gone.data?.length === 0 && deletedPage.body.includes("E2E Spotted Mare"),
  );
  const restored = await svc.restoreAnimal(db, mareId);
  const back = await anon.from("animals").select("id").eq("id", mareId);
  check("Restore brings it back, sale history and all", restored.ok && back.data?.length === 1);
  const notArchived = await svc.deleteForever(db, DEMO_RANCH, mareId, "E2E Spotted Mare");
  check("Permanent deletion needs the animal in Recently Deleted first", !notArchived.ok);
  await svc.archiveAnimal(db, mareId);
  const wrongName = await svc.deleteForever(db, DEMO_RANCH, mareId, "Some Other Horse");
  check("…and the exact name typed", !wrongName.ok);
  const forever = await svc.deleteForever(db, DEMO_RANCH, mareId, "e2e spotted mare");
  const reallyGone = await client.from("animals").select("id").eq("id", mareId);
  check("Delete forever removes it", forever.ok && reallyGone.data?.length === 0);

  // ─── Isolation ─────────────────────────────────────────────────────────────
  const other = await signIn("owner@second.test");
  const otherDb = other.client as unknown as svc.Db;
  const tamper = await svc.updateBasics(otherDb, studId, basics({ name: "Hijacked" }));
  const stillStud = await client.from("animals").select("name").eq("id", studId).single();
  check(
    "Another ranch's owner can't edit this ranch's animal, and isn't told “Saved”",
    !tamper.ok && stillStud.data?.name === "E2E Stud",
    !tamper.ok ? tamper.message : "reported success!",
  );

  // ─── Clean up ──────────────────────────────────────────────────────────────
  for (const id of cleanup.filter(Boolean)) {
    await svc.archiveAnimal(db, id);
    const { data } = await client.from("animals").select("name").eq("id", id).maybeSingle();
    if (data) await svc.deleteForever(db, DEMO_RANCH, id, data.name);
  }
  finish();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
