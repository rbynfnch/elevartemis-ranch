# Architecture decisions

Decisions confirmed in Phase 1 (defaults accepted) and made during Phases 2–3.

## Confirmed decisions (Phase 1, question J)

1. **Admin on each ranch's own domain:** `ranch.com/admin`. The ranch is
   determined by the domain; an owner's account only opens their ranch's admin.
   Staff with several memberships sign in on each ranch's site.
2. **Species per ranch:** `ranches.enabled_species`. The first ranch raises
   Quarter Horses and Herefords; other ranches may have one species.
3. **Pedigree depth:** 3 generations back (sire/dam, grandparents,
   great-grandparents; 14 ancestors), the standard horse pedigree.
   `get_pedigree(id, 3)`, capped at 5. Unknown ancestors are omitted.
4. **Reclassification is the ranch's call.** The dashboard *suggests* moving a
   foal/calf over a year old; "keep as is" sets `category_confirmed_at` and
   silences it. Changing the category resets the confirmation.
5. **In Memory:** deceased animals (`program_status = 'deceased'`, optional
   `deceased_on`) get an In Memory page under About (`/about/in-memory`),
   listed like Mares or Foals. The About menu item gains an "Our Story / In
   Memory" dropdown only when there's someone to remember.
6. **Sold prices** are not shown; `show_on_sold_page` lets the owner hide a sale.
7. **Gallery:** owner-uploaded ranch photos plus animal photos toggled in.
8. **About page:** owner edits text and photos inside fixed, designed sections.
9. **Inquiry logging:** under discussion; see the Phase 4 notes. Default until
   decided: nothing stored.
10. **Breeding Services** on stallion portfolios (below).
11. **Two-step verification:** offered to every owner; optional by default;
    Elevartemis can require it per ranch (`features.require_mfa`). Enforced
    in the database, not just the app.
12. **Extras adopted:** video links, registered vs barn name, heifer and steer
    categories, posts linked to animals.

### Per-ranch categories and menu structure

Platform categories are the default. `ranch_species_settings` (Elevartemis
only) lets a ranch narrow and order categories, add a breed heading, relabel
the top menu item, and choose which extra pages (Retired, Previous
Stallions / Reference Sires, For Sale, Sold) appear. Animals can only use the
categories their ranch offers (RA013), and a category can't be removed while
animals are in it.

First ranch's cattle program:

```
Cattle
  Herefords          (breed heading)
    Bulls
    Yearlings        (new platform category: ~12–24 months, bulls or heifers)
    Cows             (configured; appears once a cow is published)
    For Sale
```

Sold, Retired and Reference Sires are off for this ranch's cattle; sold cattle
keep their portfolios (reachable from pedigrees and offspring). Horses use the
platform defaults. The dashboard suggests calves → Yearlings at one year and
Yearlings → Bulls or Cows at two; the ranch can always keep an animal where it
is.

### The ranch in its own words

"Raising and breeding registered Quarter Horses, Appaloosas and Hereford
cattle." Used as the site tagline (owner-editable) and as the basis of the
default meta description (Elevartemis-managed; location to be added).

### Happening on the Ranch

The ranch's blog is called **Happening on the Ranch** (URL `/on-the-ranch`):
posts about ranch life and what's going on. The ranch also builds a history by
posting old photos (e.g. moving cattle) with back-dated posts:

- The owner chooses the post date, known to the day, month or year
  (`posts.date_precision`). Month/year dates are stored as noon on the 1st in
  the ranch's time zone, so they never slip into the previous month or year.
- Dates display in the ranch's time zone (`ranch_profile.time_zone`, default
  America/Denver), so an evening post is never dated tomorrow.
- A past date files the post in the history; the post page lists posts by
  year, newest first (`groupPostsByYear`). A future date schedules the post.
  Back-dated posts don't push newer posts off the homepage.
- Photos record when they were taken (`media.taken_at`, from EXIF during
  processing). When photos are added, the admin suggests a date: a day, a
  month or a year if they agree; across years it asks (`suggestPostDate`).

### Audience (first ranch)

Horses: barrel racers, ropers, breeders. Cattle (Herefords): breeders seeking
top-quality, high-producing cattle. The ranch breeds by AI. This guides
copy, SEO, suggested Quick Facts (performance record, earnings, EPDs) and the
service types offered (fresh, cooled, frozen).

### FAQs (first ranch)

Grouped on the FAQ page by `faqs.group_label`, in the order of each group's
first question (`lib/faq/group.ts`): **Horses** — bloodlines; **Cattle** —
bloodlines, weight gains, EPDs, weaning weights, birth weights; **General** —
how to ask about an animal. Answers about the ranch's own animals are
placeholders for the ranch to write; the EPD answer includes a general,
factual explanation of what EPDs are. Empty groups and unanswered questions
never render; a single group shows no heading.

## Animal management (Phase 5)

- **Admin:** Animals list (species tabs, filters: Hidden, For sale, No photo,
  Sample; name search), Add Animal, a sectioned editor (Photos, Basics, On the
  website, For Sale, Breeding Services for males, Performance for cattle,
  Facts and stories), and Recently Deleted (restore; delete forever by typing
  the name). Each section saves on its own.
- **New animals start hidden** so owners can add photos before publishing.
- **Categories offered** follow the ranch's settings (e.g. Bulls, Yearlings,
  Cows); sex options follow the category.
- **Dates** are entered at the precision known (year, month, or day).
- **Rich text** is typed as plain paragraphs for now and stored as structured
  rich text; a formatting editor arrives with the post editor (Phase 9).
- **Code shape:** `lib/admin/animals/schemas.ts` (form → validated input) →
  `service.ts` (plain functions over the owner's Supabase client, RLS applies)
  → `actions.ts` (Server Actions: ranch from the request's domain, never from
  the browser; public cache expired with `updateTag`). The e2e suite calls
  the same service functions.
- **Updates must change a row.** A Supabase UPDATE matching no rows isn't an
  error, so owner-triggered updates require a returned row; otherwise the
  owner sees "could not be found", never a false "Saved".
- **Facts/sections and photo order** save through database functions in one
  transaction (`replace_animal_details`, `reorder_animal_photos`), so a
  failed save never loses data.

### Photos

Browser: read the "taken on" date (EXIF), correct rotation, shrink to at most
3000 px (fast on rural connections), upload straight to Storage with a
one-time signed URL (no size limits from the app server). Server
(`lib/media/process.ts`, sharp): WebP at 320/640/960/1280/1920/2560 px
(never upscaled), a tiny blur placeholder, metadata (including GPS) stripped.
Photos are processed one at a time with progress shown. Owners reorder by
drag (mouse, touch or keyboard), set the main photo, replace, remove, and
pick the focal point with live previews of wide, card and phone crops.
Removing a photo deletes the files only when nothing else uses them.

### Cattle performance

`cattle_performance` (one optional row per head): birth weight, actual and
adjusted 205-day weaning weight, actual and adjusted 365-day yearling weight,
average daily gain (+ how measured), and EPDs as a dated snapshot (trait,
value, optional accuracy and percentile; common traits suggested, any trait
allowed). Implausible weights are rejected (e.g. a 780 lb birth weight).

## Breeding Services

`breeding_services` is a 1:1 optional row per breeding male (stallion or AI
bull), shown when `animals.breeding_available` is on. Every field is optional:
status (Available / Private Treaty / Retired from Breeding), stud, booking and
collection fees (stored in cents), season, service types (Live Cover, Fresh,
Cooled, Frozen, Other + description), shipping, mare requirements, live foal
guarantee (+ terms), contract (uploaded PDF in `documents` or a link),
additional terms, and a booking button (label + optional external URL; by
default it opens the animal's inquiry form).

`lib/animals/breeding.ts` turns a row into only the populated lines, with
species wording ("Standing at Stud" / "Live foal guarantee" for horses;
"Available for Breeding" / "Live calf guarantee" for cattle). With nothing
filled in, the portfolio shows just the badge and the button: no empty
heading. The `public_breeding_services` view is ready for a future Stallion
Services page without re-entering data.

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
| RA012 | Breeding services on something other than a stallion/bull |
| RA013 | Category not offered by this ranch (or settings conflict) |
| RA014 | Unknown time zone |
| RA015 | Performance records on a non-cattle animal |
| RA016 | Animal not found (or not yours) in an admin function |

Messages are written for owners and raised by the database, so every client
gets the same rules.

## Routing

`src/proxy.ts` resolves the Host header (cached in memory for 60 s):

- non-primary domain (e.g. `www.`) → 308 to the primary
- ranch domain `/admin…` → rewrite to `/admin/{slug}/…`; session refreshed;
  signed-out visitors redirected to `/admin/login?next=…`; responses are
  `private, no-store` and `noindex`
- ranch domain, anything else → rewrite to `/site/{slug}/…`
- unknown host → 404; `localhost`, `*.localhost` and `*.vercel.app` fall back
  to `DEFAULT_RANCH_SLUG` outside production
- database unreachable → 503 with Retry-After (cached hosts keep working)

## Authentication

- Supabase Auth, invite-only. Passwords: 10+ characters with letters and digits.
- Sign-in, code entry and password-reset requests run in the browser so
  Supabase's per-IP rate limits apply to the owner, not to our server.
- Email links land on `/admin/auth/confirm`, which uses the one-time token only
  when the owner clicks Continue (a POST). Email security scanners follow links
  with GET and would otherwise burn the token.
- Every admin page calls `getAdminContext(slug)`: `getUser()` (validated with
  Supabase), AAL check, membership in *this* ranch, and the ranch's two-step
  requirement. The database re-enforces all of it.
- Two-step verification: TOTP authenticator apps; owners can add a backup
  authenticator. Restrictive RLS policies require an `aal2` session for anyone
  with an authenticator, and for everyone on a ranch that requires it, so a
  stolen password can't bypass the code screen by calling the API directly.
- Recovery codes exist in Supabase's SDK but are marked experimental. Adopt
  them once stable; lost phones meanwhile go through `npm run reset:mfa`.

## Caching

Public data functions use `'use cache'` with tags from `lib/cache/tags.ts`,
keyed by ranch slug. Admin Server Actions will call `updateTag()` for exactly
the tags they affect.

## Fonts

Self-hosted via Fontsource (no build-time call to Google, no third-party font
requests). Presets: `heritage` (Libre Caslon Display/Text + Libre Franklin) and
`prairie` (Bitter + Source Sans 3). A preset is one CSS block in
`globals.css` plus one entry in `lib/brand/tokens.ts`.

## Verification performed (Phases 2–4)

Phase 4: 120 pgTAP assertions; 47 unit tests; and `scripts/e2e-auth.ts`
passed 23/23 against the real Supabase Auth server (v2.197.0) plus PostgREST
and the production build: invite-only sign-up, wrong password, same-domain
sign-in redirect, dashboard with real data, cross-ranch admin blocked both
ways with no data leaked, TOTP enrolment with genuine codes, password-only
sessions blocked at the database once 2FA is on, wrong/right codes, lost-phone
reset, and ranch-required 2FA.

Phase 5: 150 pgTAP assertions, 84 unit tests (including image processing:
sizes, WebP, rotation, EXIF date, metadata stripping), and
`scripts/e2e-animals.ts` 27/27 against real Supabase Auth + PostgREST + the
production build (add, category and sex rules, edit, For Sale → Sold,
atomic facts, breeding rules, performance, keep-as-foal, admin pages,
Recently Deleted round trip, cross-ranch tampering reported as failure).
The e2e run caught a false "Saved" on a cross-ranch edit, fixed before
commit. Photo storage (upload/download) is verified manually (see README).

### Phases 2–3

- 92 pgTAP assertions pass on Postgres 16 with a Supabase auth/storage
  stand-in (sandbox had no Docker). Please confirm with `npm run test:db` on
  Supabase's Postgres 17.
- 27 unit tests, lint and typecheck pass; production build succeeds.
- The production build was run against the seeded database through PostgREST
  with anon JWTs: per-host routing, navigation built from real data, no
  cross-ranch or draft leakage in HTML, www redirect, unknown-host 404,
  preview fallback, and 503 on database outage were all checked.
- The provisioning script was run against the same database.
