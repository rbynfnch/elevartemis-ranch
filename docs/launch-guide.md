# Launch guide: taking a ranch from empty to live

For whoever sets up a new ranch client. Owners finish most of this themselves from the admin (see the **Launch** screen); the steps below are the ones that need us.

## 1. Provision the ranch (us)

```bash
npm run provision:ranch -- --slug flying-w-ranch --name "Flying W Ranch" \
  --domain flyingwranch.example --domain www.flyingwranch.example \
  --species horse,cattle --mark FW --subtitle Ranch \
  --owner-email owner@example.com --inquiry-email owner@example.com
```

This creates the ranch, its settings rows (including the About and Contact pages), the owner's invitation and the domains. The first domain is the primary one. Run it only from a trusted machine with `SUPABASE_SECRET_KEY` in `.env.local`.

## 2. Brand (the owner, with us for anything custom)

The owner chooses the header name, a short mark, one of four color looks and a font pair on the **Brand** screen. A fully custom palette is still set by us in the ranch's branding settings (it shows as "custom" to the owner). A logo image upload is on the list for the next phase; until then the brand mark (two to four letters) is the logo.

## 3. Custom domain (us and the owner)

1. In Vercel, add the domain (and `www`) to the project.
2. At the owner's domain registrar, add the DNS records Vercel shows (an `A` record for the bare domain, a `CNAME` for `www`).
3. Wait for Vercel to show the domains as valid and the certificate as issued (usually minutes).
4. Make sure the domains are listed for the ranch (the provisioning script does this) and that the primary one is marked primary.
5. Visit the site over `https://` and check `/sitemap.xml` and `/robots.txt` load.

## 4. Email for the Contact form (us)

Messages are always saved under **Messages** in the admin. To also email the owner a copy:

1. Create a Resend account and verify the sending domain (add the DNS records they show).
2. In the Vercel project's environment settings add `RESEND_API_KEY` and `INQUIRY_FROM_ADDRESS` (for example `Ranch Website <inquiries@mail.yourdomain>`). Never put these in the code or in chat.
3. Redeploy. In **Contact Page** the owner enters the address that should receive messages.
4. Send a test message from the live Contact page and confirm the email arrives and "Reply" goes to the sender.

## 5. Content (the owner)

The **Launch** screen in the admin lists what is needed. Required to go live: a tagline, at least one animal on the website, and no sample animals left. Recommended: a photo for every animal, a homepage slide, the About page, a phone number, the message email, a search title and description for the home page, and a first post.

## 6. Go live (the owner)

The owner presses **Go live** on the Launch screen. That removes the "Preview site" bar, sets the ranch live and lets search engines in (`robots.txt` and the sitemap switch on). After launch:

- Add the site in Google Search Console and submit `/sitemap.xml` (the ranch's Search Console verification code is stored in the ranch's SEO settings).
- Optional: add a Google Analytics measurement ID in the ranch's SEO settings. The privacy page then mentions analytics automatically.

## 7. Safety net (us)

- **Backups:** confirm the Supabase project's backups are on (Settings > Database > Backups) and note how long they are kept. For a restore, use the dashboard's restore tool on the project.
- **Monitoring:** watch the Vercel deployment and function logs after launch. Error tracking (for example Sentry) and simple privacy-friendly analytics are still to be chosen; both need an account and a key set in the Vercel environment, never in the code.
- **People:** the ranch's owner adds editors and other owners on the **Team** screen.
