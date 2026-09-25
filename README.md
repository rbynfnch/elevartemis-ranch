# Elevartemis Ranch Platform

A reusable ranch website platform: a public breeding-program website for each
ranch client, plus a simple admin where the ranch owner manages animals,
photos, pedigrees, sale listings, homepage slides, updates and FAQs.

One codebase and one database serve every ranch. Each ranch is isolated by
Row-Level Security in Postgres and served on its own domain.

**Status:** Phases 2–3 complete (scaffold, design system, database, security,
tests). See [docs/decisions.md](docs/decisions.md) for the architecture and
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
  proxy.ts                  Host → ranch routing (admin host, ranch domains, redirects)
  app/
    site/[ranch]/…          Public ranch website (reached via rewrite, never directly)
    manage/…                Ranch admin (reached via the admin host)
  components/               brand/, ui/, site/, animals/
  lib/
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
| http://second.localhost:3000 | Second test ranch (exists to prove isolation) |
| http://localhost:3000 | Falls back to `DEFAULT_RANCH_SLUG` |
| http://admin.localhost:3000 | Ranch admin (sign-in arrives in Phase 4) |

Chrome, Edge and Firefox resolve `*.localhost` automatically. If Safari
doesn't, add `127.0.0.1 demo.localhost second.localhost admin.localhost` to
`/etc/hosts`.

Local logins (seed data; the admin UI arrives in Phase 4):
`owner@demo.test` and `owner@second.test`, password `ranch-demo-2026`.

## Checks

```bash
npm run check        # lint + typecheck + unit tests
npm run test:db      # pgTAP: isolation, integrity, pedigree, listing rules (needs supabase start)
npm run build
npm run db:types     # regenerate src/lib/database.types.ts after changing migrations
npm run db:reset     # rebuild the local database from migrations + seed
```

CI (`.github/workflows/ci.yml`) runs all of the above on every pull request,
and fails if generated types are out of date.

## Adding a ranch client

```bash
npm run provision:ranch -- \
  --slug cottonwood-creek --name "Cottonwood Creek Ranch" \
  --domain cottonwoodcreekranch.com --domain www.cottonwoodcreekranch.com \
  --species horse,cattle --mark CC --subtitle Ranch \
  --owner-email owner@example.com
```

This creates the ranch (in `draft`, with `noindex`), its domains (first is
primary; the rest redirect), branding basics and the owner's invitation. Then
add the domains to the Vercel project, and at launch set `ranches.status =
'live'` and `ranch_seo.noindex = false`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | all | Public key; access is enforced by RLS |
| `SUPABASE_SECRET_KEY` | server only | Bypasses RLS — contact handler, image processing, scripts |
| `NEXT_PUBLIC_ADMIN_HOST` | all | Host serving the admin, e.g. `manage.elevartemis.com` |
| `DEFAULT_RANCH_SLUG` | dev/preview | Ranch shown on localhost and `*.vercel.app` previews |
| `APP_ENV` | optional | Force `development`/`preview`/`production` |

Later phases add Resend, Turnstile and Upstash keys (see `.env.example`).

## Deployment

1. Create Supabase projects for **staging** and **production** (Pro plan for
   production: free projects pause when idle). Link with `npx supabase link`
   and apply migrations with `npx supabase db push`. Never run `seed.sql` there.
2. In Supabase Auth: disable sign-ups, set the Site URL to the admin host, and
   add `https://<admin-host>/**` to redirect URLs.
3. Create one Vercel project from this repo. Production uses the production
   Supabase project; Preview uses staging. Add every ranch domain and the admin
   host to the project.
4. Merges to `main` deploy to production; pull requests get preview URLs.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Architecture | ✅ |
| 2 | Project structure, design system | ✅ |
| 3 | Database, RLS, integrity rules, tests | ✅ |
| 4 | Authentication and admin shell | Next |
| 5 | Animal management, photo pipeline | |
| 6 | Pedigree and offspring (admin builder + public tree) | |
| 7 | Public website pages, SEO foundation | |
| 8 | Homepage hero system | |
| 9 | What's Happening on the Ranch | |
| 10 | Contact and animal inquiries | |
| 11 | Responsive and mobile polish | |
| 12 | Motion, accessibility, performance | |
| 13 | Full end-to-end testing | |
