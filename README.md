# Elevartemis Ranch Platform

A reusable ranch website platform: a public breeding-program website for each
ranch client, plus a simple admin where the ranch owner manages animals,
photos, pedigrees, sale listings, homepage slides, updates and FAQs.

One codebase and one database serve every ranch. Each ranch is isolated by
Row-Level Security in Postgres and served on its own domain.

**Status:** Phases 2–5 complete (scaffold, design system, database, security,
sign-in with two-step verification, admin shell, animal management and photos). See [docs/decisions.md](docs/decisions.md) for the architecture and
[Roadmap](#roadmap) for what comes next.

---

## Stack

| | |
|---|---|
| App | Next.js 16 (App Router, Cache Components, `proxy.ts`), React 19, TypeScript |
| Data / auth / files | Supabase: Postgres + RLS, Auth, Storage |
| Styling | Tailwind CSS 4 with CSS-variable design tokens; self-hosted fonts (Fontsource) |
| Validation | Zod (shared by client and server; the server is authoritative) |
| Tests | Vitest (unit), pgTAP via `supabase test db` (database & RLS) |
| Hosting | Vercel (app), Supabase (data) |

## Repository layout

```
src/
  proxy.ts                  Host → ranch routing (public site and /admin on every ranch domain)
  app/
    site/[ranch]/…          Public ranch website    (ranch.com/…)
    admin/[ranch]/…         Ranch admin             (ranch.com/admin/…)
      (auth)/               Sign in, code entry, password reset, email-link landing
      (admin)/              Dashboard, account & two-step verification, sections
  components/               brand/, ui/, site/, animals/
  lib/
    admin/dashboard.ts      "Needs attention" rules (pure, tested)
    animals/breeding.ts     Breeding Services display rules (only populated fields)
    auth/                   Admin context, actions, password rules, plain-language errors
    brand/tokens.ts         Palette, font presets, WCAG contrast checks
    cache/tags.ts           Cache tags expired by admin saves
    content/                "Never show empty information" helpers, safe rich text
    domain/species.ts       Horse/cattle terminology ("Foaled" vs "Calved")
    site/                   Cached site settings, navigation builder
    supabase/               public · server · browser · service (server-only) clients
    tenant/                 Hostname normalisation and resolution
    database.types.ts       Generated — `npm run db:types`
supabase/
  migrations/               Schema, integrity triggers, RLS, storage, functions
  seed.sql                  Local demo data (two ranches) — never run in production
  tests/database/           pgTAP suites
scripts/provision-ranch.ts  Create a new ranch client (Elevartemis staff)
scripts/reset-mfa.ts        Remove an owner's authenticators after a lost phone (staff)
scripts/e2e-auth.ts         End-to-end sign-in / two-step / isolation checks
docs/decisions.md           Architecture decisions, listing rules, error codes
```

## Local development

Prerequisites: Node 22+, Docker (for the local Supabase stack), Git.

```bash
npm install
npx supabase start               # starts Postgres/Auth/Storage, applies migrations + seed
npx supabase status              # copy the API URL, publishable key and secret key
cp .env.example .env.local       # paste those values in
npm run dev
```

Then open:

| URL | What |
|---|---|
| http://demo.localhost:3000 | Demo ranch ("Cottonwood Creek Ranch" — placeholder name) |
| http://demo.localhost:3000/design-system | Temporary brand review page (draft ranches only) |
| http://demo.localhost:3000/admin | Demo ranch admin |
| http://second.localhost:3000 | Second test ranch (exists to prove isolation) |
| http://localhost:3000 | Falls back to `DEFAULT_RANCH_SLUG` |

Chrome, Edge and Firefox resolve `*.localhost` automatically. If Safari
doesn't, add `127.0.0.1 demo.localhost second.localhost` to
`/etc/hosts`. Sent emails (invitations, password resets) appear in the local
mail viewer at http://127.0.0.1:54324.

Local logins: `owner@demo.test` (demo ranch) and `owner@second.test` (second
ranch), password `ranch-demo-2026`. Each works only on its own ranch's
`/admin`.

## Checks

```bash
npm run check        # lint + typecheck + unit tests
npm run test:db      # pgTAP: isolation, integrity, pedigree, listings, 2FA, breeding (needs supabase start)
npm run test:e2e:auth     # real sign-in, two-step codes, cross-ranch checks
npm run test:e2e:animals  # add/edit/sale/sold/breeding/performance/delete as a real owner
                          # (both need `supabase start` + the app running; never production)
npm run build
npm run db:types     # regenerate src/lib/database.types.ts after changing migrations
npm run db:reset     # rebuild the local database from migrations + seed
```

CI (`.github/workflows/ci.yml`) runs all of the above on every pull request,
and fails if generated types are out of date.

## Photos: manual check

Photo uploads use Supabase Storage, which the automated suites don't cover.
After `supabase start` and `npm run dev`, open an animal in the admin and:
upload several photos (including a large phone photo and a portrait one),
drag to reorder, make one the main photo, adjust its focal point and check
the three crop previews, replace one, and remove one. The files appear in
Supabase Studio (http://127.0.0.1:54323) under Storage → `ranch-media`.

## Adding a ranch client

```bash
npm run provision:ranch -- \
  --slug cottonwood-creek --name "Cottonwood Creek Ranch" \
  --domain cottonwoodcreekranch.com --domain www.cottonwoodcreekranch.com \
  --species horse,cattle --mark CC --subtitle Ranch \
  --owner-email owner@example.com
```

This creates the ranch (in `draft`, with `noindex`), its domains (first is
primary; the rest redirect), branding basics and the owner's invitation (the
link opens `https://<primary domain>/admin`). The script prints the remaining
manual steps: add `https://<domain>/admin/**` to Supabase Auth → Redirect URLs,
and add the domains to Vercel. At launch set `ranches.status = 'live'` and
`ranch_seo.noindex = false`.

Menu structure per ranch (categories, order, breed heading, which extra pages
show) lives in `ranch_species_settings`, e.g. the first ranch's cattle:

```sql
insert into ranch_species_settings (ranch_id, species, breed_heading, categories, show_sold, show_retired, show_reference)
values ('<ranch id>', 'cattle', 'Herefords', '{cattle.bull,cattle.yearling,cattle.cow}', false, false, false);
```

To require two-step verification for a ranch:
`update ranches set features = features || '{"require_mfa": true}' where slug = '…';`

Lost phone: after confirming the owner's identity by phone,
`npm run reset:mfa -- --email owner@example.com`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | all | Public key; access is enforced by RLS |
| `SUPABASE_SECRET_KEY` | server only | Bypasses RLS — contact handler, image processing, scripts |
| `DEFAULT_RANCH_SLUG` | dev/preview | Ranch shown on localhost and `*.vercel.app` previews |
| `APP_ENV` | optional | Force `development`/`preview`/`production` |

Later phases add Resend, Turnstile and Upstash keys (see `.env.example`).

## Deployment

1. Create Supabase projects for **staging** and **production** (Pro plan for
   production: free projects pause when idle). Link with `npx supabase link`
   and apply migrations with `npx supabase db push`. Never run `seed.sql` there.
2. In Supabase Auth: disable sign-ups; set the password policy to 10+
   characters with letters and digits; enable TOTP under Multi-Factor; add each
   ranch's `https://<domain>/admin/**` to Redirect URLs; and paste
   `supabase/templates/invite.html` and `recovery.html` into the Invite and
   Reset Password email templates. Configure custom SMTP (e.g. Resend) so
   emails don't hit Supabase's low default sending limit.
3. Create one Vercel project from this repo. Production uses the production
   Supabase project; Preview uses staging. Add every ranch domain to the project.
4. Merges to `main` deploy to production; pull requests get preview URLs.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Architecture | ✅ |
| 2 | Project structure, design system | ✅ |
| 3 | Database, RLS, integrity rules, tests | ✅ |
| 4 | Authentication, two-step verification, admin shell | ✅ |
| 5 | Animal management, photo pipeline | ✅ |
| 6 | Pedigree and offspring (admin builder + public tree) | Next |
| 7 | Public website pages, SEO foundation | |
| 8 | Homepage hero system | |
| 9 | Happening on the Ranch | |
| 10 | Contact and animal inquiries | |
| 11 | Responsive and mobile polish | |
| 12 | Motion, accessibility, performance | |
| 13 | Full end-to-end testing | |
