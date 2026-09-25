# Architecture decisions

Decisions confirmed in Phase 1 (defaults accepted) and made during Phases 2–3.

## Confirmed defaults

- **Admin location:** central admin host (e.g. `manage.elevartemis.com`);
  `ranch.com/admin` redirects there.
- **Species:** horses and cattle both enabled for the first ranch; each ranch
  enables its own set (`ranches.enabled_species`).
- **Pedigree depth:** 3 generations back by default (`get_pedigree(id, 3)`,
  capped at 5). Unknown ancestors are omitted, never shown as blank boxes.
- **Foal → Young Horse:** manual. The admin dashboard will nudge when a foal is
  over a year old.
- **Deceased:** a program status. Hidden from list pages; the portfolio stays
  reachable through pedigree and offspring links.
- **Sold prices:** not shown. `show_on_sold_page` lets the owner hide a sale.
- **Gallery:** owner-uploaded ranch photos plus animal photos toggled in
  (`media.in_gallery`).
- **About page:** the owner edits text and photos inside fixed, designed
  sections (`pages.sections`); Elevartemis owns the layout.
- **Inquiries:** nothing stored. On send failure the visitor sees an error and
  the ranch phone number.
- **Stallion services:** a "Standing at stud" flag (`breeding_available`) plus
  Quick Facts for terms. A dedicated page can come later behind a feature flag.
- **Extras adopted:** video links, registered vs barn name, heifer and steer
  categories, posts linked to animals. (Embryo-transfer recipient dam is not
  yet modelled; it would be a nullable `recipient_dam_id`.)

## Data model principles

1. **One table for inventory and outside ancestors** (`animals.record_scope`).
   Promoting an outside ancestor is one UPDATE — same id, all links intact.
2. **Classification as independent dimensions**, never free tags: category
   (one), program status (one), sale listing (0–1), flags. Contradictory states
   ("For Sale" and "Sold") are impossible.
3. **Parentage stored once, on the child.** Offspring are always derived.
4. **Tenant isolation in the keys.** Every tenant row has `ranch_id`; child
   rows use composite foreign keys `(ranch_id, x_id) → parent(ranch_id, id)`,
   so cross-ranch references are impossible even for staff with access to both.
5. **Settings split by editor** (owner / private / Elevartemis-only tables),
   because RLS works per table and row, not per column.
6. **Empty content is never stored.** Blank facts and empty rich-text
   documents are rejected by CHECK constraints; the UI renders only what
   exists.
7. **Demo content is flagged** (`is_demo`) so it can be removed in one step
   before launch.

## Public listing rules

Defined once in the `public_animal_cards` view. All require: ranch-owned,
published, not archived, ranch not suspended.

| Page | Rule |
|---|---|
| Category (Stallions, Mares, …) | program status active, not sold |
| Foals / Calves | category rule, grouped by `birth_year` |
| Retired | program status retired, not sold |
| Previous Stallions / Reference Sires | program status reference |
| For Sale | sale available or pending, not deceased (also shown in its category) |
| Sold | sale sold and `show_on_sold_page` |

Navigation is built from `public_nav_counts()`: empty buckets don't appear.

## Error codes (database → admin messages)

| Code | Meaning |
|---|---|
| RA001 | Category doesn't match species |
| RA002 | Sex not allowed for category |
| RA003 | Sire recorded as female |
| RA004 | Dam not female |
| RA005 | Outside ancestor can't be listed for sale |
| RA006 | Parent is a different species |
| RA007 | Would make an animal its own ancestor |
| RA008 | Sex change contradicts recorded offspring |
| RA009 | Species change contradicts relatives |
| RA010 | Main photo isn't one of the animal's photos |
| RA011 | More than 3 active homepage slides |

Messages are written for owners and raised by the database, so every client
gets the same rules.

## Routing

`src/proxy.ts` resolves the Host header (cached in memory for 60 s):

- admin host → `/manage/…` (session refreshed)
- ranch domain `/admin…` → redirect to the admin host
- non-primary domain (e.g. `www.`) → 308 to the primary
- ranch domain → rewrite to `/site/{slug}/…`
- unknown host → 404; `localhost`, `*.localhost` and `*.vercel.app` fall back
  to `DEFAULT_RANCH_SLUG` outside production
- database unreachable → 503 with Retry-After (cached hosts keep working)

## Caching

Public data functions use `'use cache'` with tags from `lib/cache/tags.ts`,
keyed by ranch slug. Admin Server Actions will call `updateTag()` for exactly
the tags they affect.

## Fonts

Self-hosted via Fontsource (no build-time call to Google, no third-party font
requests). Presets: `heritage` (Libre Caslon Display/Text + Libre Franklin) and
`prairie` (Bitter + Source Sans 3). A preset is one CSS block in
`globals.css` plus one entry in `lib/brand/tokens.ts`.

## Verification performed (Phases 2–3)

- 92 pgTAP assertions pass on Postgres 16 with a Supabase auth/storage
  stand-in (sandbox had no Docker). Please confirm with `npm run test:db` on
  Supabase's Postgres 17.
- 27 unit tests, lint and typecheck pass; production build succeeds.
- The production build was run against the seeded database through PostgREST
  with anon JWTs: per-host routing, navigation built from real data, no
  cross-ranch or draft leakage in HTML, www redirect, unknown-host 404,
  preview fallback, and 503 on database outage were all checked.
- The provisioning script was run against the same database.
