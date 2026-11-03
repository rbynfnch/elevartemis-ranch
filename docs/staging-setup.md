# Staging setup: Flying W Ranch

Project: `https://yckbufazmyimkvcpxvob.supabase.co` (`ranch-staging`).
Schema is applied with `npx supabase db push`. Never run `seed.sql` here.

## 1. Keys (your machine only)
Copy `.env.staging.example` to `.env.staging` and fill in the two keys from
Supabase -> Project Settings -> API Keys. Never commit or paste them.

## 2. Vercel
Import the repo, Node 24.x. Env vars: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and
`DEFAULT_RANCH_SLUG=flying-w-ranch` (Preview only). Note the `*.vercel.app` host.

## 3. Supabase dashboard
Auth: email provider on, sign-ups off, password min 10 with letters and digits,
TOTP on. URL Configuration: Site URL = the Vercel URL; Redirect URLs =
`https://<project>.vercel.app/admin/**`. Paste `supabase/templates/invite.html`
and `recovery.html` into the Invite and Reset Password templates.

## 4. Provision the ranch (needs the Vercel host so the invite link works)
```bash
npx tsx --env-file=.env.staging scripts/provision-ranch.ts --slug flying-w-ranch --name "Flying W Ranch" --domain <project>.vercel.app --species horse,cattle --mark FW --subtitle Ranch --owner-email elevartemis@gmail.com
```

## 5. Ranch settings
Paste `supabase/staging/flying-w-setup.sql` into the SQL editor and run it. The
last query should show two rows and the tagline. The ranch stays `draft`
(noindex) until launch.
