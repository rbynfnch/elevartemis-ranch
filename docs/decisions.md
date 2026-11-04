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
4. **Reclassification is the ranch's call.** The dashboard _suggests_ moving a
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

| Page                                 | Rule                                                                 |
| ------------------------------------ | -------------------------------------------------------------------- |
| Category (Stallions, Mares, …)       | program status active, not sold                                      |
| Foals / Calves                       | category rule, grouped by `birth_year`                               |
| Retired                              | program status retired, not sold                                     |
| Previous Stallions / Reference Sires | program status reference                                             |
| For Sale                             | sale available or pending, not deceased (also shown in its category) |
| Sold                                 | sale sold and `show_on_sold_page`                                    |

Navigation is built from `public_nav_counts()`: empty buckets don't appear.

## Error codes (database → admin messages)

| Code  | Meaning                                                   |
| ----- | --------------------------------------------------------- |
| RA001 | Category doesn't match species                            |
| RA002 | Sex not allowed for category                              |
| RA003 | Sire recorded as female                                   |
| RA004 | Dam not female                                            |
| RA005 | Outside ancestor can't be listed for sale                 |
| RA006 | Parent is a different species                             |
| RA007 | Would make an animal its own ancestor                     |
| RA008 | Sex change contradicts recorded offspring                 |
| RA009 | Species change contradicts relatives                      |
| RA010 | Main photo isn't one of the animal's photos               |
| RA011 | More than 3 active homepage slides                        |
| RA012 | Breeding services on something other than a stallion/bull |
| RA013 | Category not offered by this ranch (or settings conflict) |
| RA014 | Unknown time zone                                         |
| RA015 | Performance records on a non-cattle animal                |
| RA016 | Animal not found (or not yours) in an admin function      |

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
  Supabase), AAL check, membership in _this_ ranch, and the ranch's two-step
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

### Supabase API keys and ESLint 10

- Every Supabase client goes through `keyAwareFetch` (`src/lib/supabase/api-key.ts`).
  New-style `sb_publishable_` / `sb_secret_` keys are not JWTs, so they are
  sent only in the `apikey` header and never as the Bearer token. Legacy JWT
  keys are unaffected. Verified by unit tests; still to confirm against a real
  project using `sb_` keys.
- ESLint 10 with `eslint-config-next` 16.4.4 (16.3.6 crashes under ESLint 10
  in eslint-plugin-react). Some nested plugins still declare an ESLint 9 peer
  range; `npm ci`, lint and tests pass regardless.
- `demo.localhost` refusing connections could not be reproduced in the cloud
  sandbox (no IPv6). The README documents the diagnosis; the hosts-file entry
  is the dependable fix.

### Public homepage restyle (to the Flying W mockup)

- Header and footer are dark (`night`) with letter-spaced capitals; no search
  icon; footer is slim with nav, social icons and the tagline.
- Hero (`HeroSlider`): photo full-bleed, text block on the right, from
  `hero_slides`. Autoplay only without reduced motion, pauses on hover/focus
  and has a Pause button. A slide with no ready photo still shows its text
  over the brand colour, so the hero is never blank before photography exists.
  Buttons resolve through `slideHref`; a button whose target is gone is dropped.
- Icon row is built from the real navigation: no species, no tile. Tile lines
  use the ranch's own breed heading or short claim-free descriptors.
- Story section appears only when the owner has written an intro (about text),
  never from filler. The mockup's "More Than a Ranch" copy and Angus/animal
  details were NOT used (not client-confirmed). The story photo is not built
  yet: there is no field for it.
- Featured-animal cards show category, name, and "breed · year" from real
  data only.
- Not built yet: combined top-level "For Sale" nav item and its icon tile
  (appears automatically once the nav includes it), story photo, "Ranch Life"
  tile (named "Happening on the Ranch" per the client).
- Verified with lint, typecheck, unit tests, a production build, and desktop
  and phone screenshots against a fake PostgREST server with fixture photos
  cropped from the mockup. Not verified: the no-slides/no-animals fallback,
  slider autoplay, a real database.

### One Save on the animal page; new-animal defaults; Quick Facts labels

- The animal edit page is one form (`AnimalEditForm`) with one Save bar at the
  bottom. `saveAnimalAction` checks every section first (`parseAnimalEdit`),
  then writes Basics, On the website, For Sale, Breeding, Performance and Facts
  in order. A database rule that rejects one section reports which sections
  saved and which did not (there is no cross-table transaction). Photos stay
  immediate: they save as they're added, reordered or removed.
- The form submits through a transition, so typed values stay on screen after
  saving instead of resetting to the loaded values.
- New animals start Active and shown on the website (they were hidden).
  Existing animals are unchanged. The e2e check was updated to match.
- Quick Facts labels: any label the owner types is remembered per ranch
  (read from existing facts, most used first) and suggested on every animal,
  after the platform's starter labels. There is no separate label list to
  manage; add a label by using it once.
- Not verified in a browser against a real signed-in session; covered by unit
  tests, lint, typecheck and a production build. Run the e2e scripts locally.

### Photo Library

- `media.file_name` (migration `20260928000100`) keeps each photo's upload
  name, unique per ranch ignoring capitals. Duplicate uploads become
  `name-2.jpg`, `name-3.jpg`. Photos from before the migration are "Untitled"
  and can be named in the library.
- `/admin/photos` lists every ready photo: upload many, rename, copy name,
  search, and delete only when nothing uses it (animals, update posts,
  homepage slides, Gallery). A used photo's Delete is disabled and says where.
- Animal pages can "Choose from library" (multi-select; photos already on the
  animal are hidden) as well as upload.
- Behaviour change: "Remove" on an animal's photo now only takes it off that
  animal; the file stays in the library. Previously it deleted unused files.
  Deleting for good happens in the library (and Delete forever on an animal
  still removes photos only that animal used).
- The CSV importer (next) will match its `photos` column against these names.
- Not verified against a real database or in a browser (no Docker here).
  Manual check list: upload two photos with the same name; rename to a taken
  name (expect an error); attach from the picker; remove from the animal and
  see it remain in the library; try deleting a used photo (expect refusal).

### Photo Library: categories and bulk actions

- `media.species` (migration `20260928000200`): an optional category the owner
  files a photo under before it is on any animal. A photo shows under a
  species tab when it is filed under it OR an animal of that species uses it.
  The "Uncategorized" tab = no category and no animal. Tabs come from the
  ranch's enabled species, so sheep or goats appear when enabled.
- Bulk bar above the grid (WordPress-style): Select all, Deselect, click a
  photo to select (Shift-click for a range), an action menu and Apply.
  Actions: File under <species> / No category, Add to an animal (search by
  name), Delete (photos in use are kept and reported). Renaming stays
  double-click on the name.
- Category is validated server-side against the ranch's enabled species.
- Not verified against a real database or in a browser.

### Photo Library: toolbar, views, sorting, paging

- One toolbar row (after WordPress's Media Library): list/thumbnail toggle,
  category filter, "Not used yet" filter, sort (newest, oldest, name A–Z/Z–A),
  photos per page (25, 50, 100, 250; default 50), Bulk select, search.
- Upload is hidden behind the "Upload Photos" button next to the title and
  expands to the drag-and-drop box.
- Photos can be selected at any time (no mode): click a photo or tick its row;
  Shift-click selects a range. "Select page" in the toolbar selects everything
  on the current page. As soon as one is selected, a sticky action bar appears
  (count, Deselect, action menu, Apply).
- List view is a table (thumbnail, name, category, used by, added); details
  collapse under the name on narrow screens.
- Changing any filter, the sort, the search or the page size returns to page 1.
- Paging and sorting happen in the browser over up to 1000 photos, the most the
  library loads. A real server-side page is needed beyond that.

### Photo Library: larger view, animal links, Assigned / Unassigned

- Each photo has an expand icon (grid: top-right corner, so clicking the photo
  still selects; list: the thumbnail itself) that opens a larger view with the
  name, category, assigned animals, size and date, and previous/next (arrow
  keys; Esc closes). Moves through the photos on the current page.
- "Assigned to" names are links to the animal's edit page. Filters, sort, view,
  page size, page and search are kept in the address bar (replaceState), so
  Back from an animal returns to the same view. Selection is not kept.
- The usage filter is All photos / Assigned / Unassigned. Assigned = on an
  animal, a homepage slide, an update post or the Gallery.

### Breeds

- `ranch_breeds` (migration `20260928000300`): each ranch's list of breeds per
  species. `animals.breed` stays text, so public pages and pedigrees are
  unchanged. The database keeps both in step: saving an animal with a new breed
  adds it to the list, other capitalisations map to the list's spelling,
  renaming (`rename_breed`) renames every animal using it atomically, and a
  breed still in use can't be deleted (RA017). Any entry path (form, CSV
  import, scripts) gets the same behaviour.
- Animal form: Breed is a dropdown of the ranch's breeds for the animal's
  species, with "+ Add a new breed…" revealing a name box. Nothing is added
  until the animal is saved.
- `/admin/breeds`: add, rename (double-click, like the Photo Library), remove
  unused breeds, see how many animals use each, and one-click common breeds as
  suggestions only (nothing is added for the ranch unless chosen).
- Existing breeds are carried into each ranch's list by the migration.
- Not verified against a real database or in a browser; the new pgTAP file
  `10_ranch_breeds.test.sql` has not been run.

- Removing a breed hides it (`ranch_breeds.hidden`, migration `20260928000400`)
  instead of deleting it. Hidden breeds leave the list and the animal form's
  dropdown and appear first among the suggestions under the list, with the
  common breeds, so one click adds them back. Saving an animal (form or CSV)
  with a hidden breed's name restores it. Hiding is refused while animals use
  the breed, like deleting.

### Public animal page

- `/horses/<name>`, `/cattle/<name>` (`src/app/site/[ranch]/[species]/[slug]`):
  gallery (main photo first, thumbnails, full-screen view with arrow keys),
  header with category, status badges (For Sale / Sale Pending / Sold, Retired,
  Previous Stallion / Reference Sire, In Memory, Standing at Stud), name,
  registered name, a Quick Facts panel (basics, then the owner's own facts), a
  sale box (price as the owner chose: price, "Contact for price", or none), an
  inquiry button, then description, story sections, Breeding Services and, for
  cattle, Performance (weights and an EPD table).
- Everything is built by `src/lib/animals/portfolio.ts`, which returns only what
  exists (no blank labels, no "N/A"; a date shows only as precisely as known;
  a sold animal never shows a price; a missing EPD accuracy/rank column is hidden).
- Renamed animals redirect (301) from their old address; hidden, deleted or
  unknown animals are not found. Page title, description, canonical address and
  Open Graph image are set per animal.
- Known limits: the "Inquire / Ask about" button goes to `/contact?animal=…`
  (the contact page is a later phase); an unknown address shows the not-found
  page with status 200 because the page streams (Next marks it noindex);
  pedigree and offspring arrive with Phase 6; the category breadcrumb isn't a
  link until category pages exist.
- Verified with unit tests, lint, typecheck, a production build and desktop and
  phone screenshots against a fake database server (fixture photos from the
  mockup). Not yet seen against the real staging data.

### CSV import and export of animals

- `/admin/animals/import` (button "Import CSV" on the Animals list): upload a CSV,
  see a preview (what will be added or updated, every problem with its row and
  column, new breeds, photos missing from the library), then confirm. Nothing is
  saved before the confirmation; rows with problems are skipped and reported, the
  rest import. The server re-reads the file on confirm, so the preview can't be
  tampered with.
- Columns: id, name, species, category, sex, breed, color, registered_name,
  registry, registration_number, birth_date, description, status, published,
  featured, for_sale, price, quick_facts, photos. Friendly header names are
  accepted (DOB, Show on website…); unknown columns are listed, not silently used.
  Semicolon- and tab-separated files and Excel's byte-order mark are handled.
- Matching: a row with an `id` updates that animal; otherwise the same name and
  species updates the existing animal (two animals with one name needs the id);
  otherwise a new animal is added.
- A blank cell never erases anything. Quick facts add to or replace by label and
  story sections are kept. A sex that the category implies (a Bull) is filled in.
  New animals are shown on the website and Active unless the sheet says otherwise.
- Photos are matched to Photo Library names, with or without the file type,
  ignoring capitals; the first listed becomes the main photo. A missing photo is
  a warning, not an error.
- Breeds typed in the sheet are added to the breed list by the database trigger.
- "Download template" (header only) and "Download my animals" (same columns, so an
  edited download can be uploaded again). Up to 500 animals and about 900 KB per file.
- Not built yet: sire and dam (pedigree arrives with Phase 6), videos, breeding
  services and cattle performance columns.
- Covered by unit tests of the reader and the planning rules. The saving and export
  steps have not been run against a real database yet.

### Group pages and menu

- `/horses`, `/cattle` (overview): the ranch's own heading (breed heading above the
  title, e.g. "Herefords"), then a section per category in the ranch's order, each
  with up to 8 animals and "View all N", then links to For Sale / Retired /
  Previous Stallions / Sold when the ranch offers them and they have animals.
- `/<species>/<category>` (Bulls, Stallions…): all animals in that category; foals
  and calves are grouped by birth year, newest first, animals with no year last
  with no heading. `/<species>/for-sale`, `/sold`, `/retired`, `/previous-stallions`
  or `/reference-sires` use the same layout. The second path segment is resolved
  by `resolveListing` (a listing page, "none" for a page or category the ranch
  turned off, otherwise an animal's own page), so an animal can't be reached under
  a category's or a special page's address.
- `/for-sale`: horses and cattle together, one section per species. The menu has a
  single top-level "For Sale" item whenever any species has animals for sale and
  the ranch hasn't turned for-sale pages off.
- For-sale cards show the price as the owner chose (price, "Contact for price", or
  nothing). A category page with no animals shows a short invitation to get in touch.
- Breadcrumbs on every one of these pages and on the animal page; the category
  crumb is a link only when the ranch offers that category page.
- Known limits: a mistyped address shows the not-found page with a 200 status (the
  pages stream); In Memory (`/about/in-memory`) is not built yet.

### In Memory page

- `/about/in-memory`: every published animal marked "In Memory", grouped by horse
  and cattle (headings only when the ranch has both), as cards with breed and a
  lifespan line built only from what the owner entered: "2012 – 2024",
  "2012 – March 2024", "Passed 2024" or "Born 2012". The page is reached from the
  menu's About > In Memory, which appears only when someone is published there; a
  direct visit with nobody to remember shows the not-found page.
- Each card links to the animal's own page, which carries an In Memory badge and
  "In loving memory · date".
- The cards view doesn't carry the passing date, so it is read from the animals
  themselves (the same published rows visitors may already read); no migration.
- The "About" crumb is plain text until the About page exists.

### Pedigree (Phase 6)

- Owner: the animal page's "Parents and pedigree" section is a visual builder
  (bracket on wide screens, stacked list on phones) over three generations. Each
  empty place is "+ Add sire" / "+ Add dam"; a filled one has Change (switch or
  remove). Choosing offers "From my records" (same species, the right sex: a dam
  is female, a sire anything but female) or "Add one I don't own" (name,
  registry, registration number, year, color, notes), which also lists records
  with similar names so the same horse isn't entered twice. Changes save as they
  are made (they edit other animals' records too), unlike the one Save button.
- An ancestor the ranch doesn't own is a `pedigree_only` animal: never listed on
  the site, never for sale; removing one from a pedigree keeps its record. The
  database enforces parent rules (RA003/RA004/RA006/RA007) and its messages are
  shown as written.
- Visitors: a bracket (animal left, then parents, grandparents, great-grandparents,
  only as many columns as there are generations) or, on phones, an indented list.
  An ancestor with a public page is a link; any other is plain text with its
  registration ("AQHA #2706274") and, if the owner wrote any, a "About …" note.
  Unknown ancestors are left out. Sire and dam pages list offspring by year
  (built from the foals' own records, with the other parent).
- Migration `20260928000500`: get_pedigree also returns registry and registration
  number (outside ancestors always; a ranch animal only when published), and
  animals get optional `tagline` and up to four `highlights` (used by the profile
  refresh, next). Before the migration is applied everything works; registration
  numbers just don't show yet.
- Not built yet: "Move to My animals" for an outside ancestor that the ranch later
  acquires (the data model supports it); a pedigree print/share view.

- Editing an ancestor: a horse the ranch doesn't own has "Edit details" in the
  pedigree builder (name, registry, registration number, year, color, notes;
  the same fields as adding, via `ancestorColumns`). It only ever changes
  pedigree-only records; a horse the ranch owns shows "Open" instead, which goes
  to its own admin page. The builder updates in place after saving.

### Animal profile header (from the Flying W concept)

- Right of the photos, top to bottom: the breed in small capitals (falls back to
  the category), the name, a For Sale / Sale Pending / Sold ribbon in the corner,
  the tagline (italic), small chips for Retired / Previous Stallion / In Memory /
  Standing at Stud, the attribute strip, the description, highlights, the price
  box when for sale, then the Inquire button and Watch Video.
- Attribute strip = birth year, sex, height (the owner's "Height" Quick Fact),
  color (the owner's "Color" fact wins over the color field), registration; a
  value over a small label, one row, only what exists. Everything else (a precise
  foaling date, registered name, the owner's other Quick Facts) goes in a Details
  section below; the breed is the heading, so it isn't repeated.
- Highlights (up to four short phrases of at most 30 characters) all use one
  small rosette mark: no icon library to maintain. A small curated set can be added
  later if owners ask.
- Tagline (at most 160 characters), highlights and a video link are edited under
  "Headline and highlights" on the animal page and saved with the one Save button.
- Watch Video opens the link in a new tab, so YouTube, Vimeo, TikTok, Instagram
  and Facebook all work with nothing embedded. Only https links on those sites are
  accepted (checked in the app and in the database, migration `20260928000600`).
- The old "About {name}" block is gone: the description now sits in the header.
- Needs migrations `20260928000500` (tagline, highlights) and `20260928000600`
  (video sites). Until they are applied, saving the Headline section fails with a
  message and the public page shows no tagline, highlights or video.

## Pedigree shaped like the all-breed charts (height, 5 generations)

- Each ancestor can now carry what the all-breed pedigree charts show: name, color, **height** (like 15.3hh), birth year, breed and registration. Height is a new `animals.height` column (migration `20260928000700`), also returned by `get_pedigree`.
- Height is on the ancestor form, the animal's Basics form and the profile's attribute strip (the animal's own height wins over a "Height" Quick Fact).
- The public pedigree loads up to 5 generations and starts at 3; a "Show 3 / 4 / 5 generations" toggle appears only when more are recorded. Outer generations use compact cards. A card shows "color · height · year", the breed only when it differs from the animal's, and the registration number.
- Saving Basics still works before the height migration is applied (it retries without the height column).
- The "Find on Pedigree Online" import is deliberately not started; it waits on their reply about API access.
