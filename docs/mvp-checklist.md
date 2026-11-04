# MVP checklist: a ranch website template

Where we are against "a rancher can get a finished, good-looking website without a developer".
`[x]` is built and pushed, `[ ]` is still to do. Items marked ⚠ need your action, not mine.

## Already built

- [x] Multi-ranch platform: one codebase, each ranch on its own domain, its own data, private to it (Row-Level Security, two-step sign-in)
- [x] Public pages: Home (hero slider), About, Horses, Cattle, category pages, For Sale (search, filters, sort), Sold, Retired, Previous Stallions / Reference Sires, In Memory, Contact
- [x] Animal profiles: photos, headline and highlights, video link, attribute strip, story, pedigree (up to 7 generations), offspring, breeding, cattle performance, sale lots with head count and price per head
- [x] Admin: animals (add, edit, archive, restore), Photo Library, Breeds, CSV import and export (animals and pedigrees), Previous / Next arrows, unsaved-changes prompt
- [x] Page Banners for every page (photo from the library, headline, subheadline), category pages photo only
- [x] About Page editor, Contact Page editor, Messages inbox
- [x] Contact form that saves every message, with spam protection that needs no captcha
- [x] Provisioning script for a new ranch; database tests for the rules that matter (privacy, categories, pedigree, sales)

## Must have before a ranch can launch

- [ ] ⚠ Apply every database update to staging and later to production (`npx supabase db push`, check `migration list` ends at 001500)
- [x] **Homepage editor** (up to three slides with photo, headline, subheadline and button)
- [x] **Ranch Info screen** (tagline, introduction, phone, place, links, blog name)
- [ ] ⚠ **Email notifications** for the Contact form: a Resend account, a verified sending domain, `RESEND_API_KEY` and `INQUIRY_FROM_ADDRESS` in Vercel (never in chat)
- [~] **Brand setup for a new ranch**: the owner picks name, mark, one of four color looks and a font pair on the Brand screen; a logo image upload is still to do
- [x] **Blog** ("Happening on the Ranch" / "Experiences", the ranch chooses the name): posts admin, public list and post pages, linked animals, banner
- [x] **Breeding Services page** ("Stallion Services" for horses, "Breeding" for cattle): the owner's data and the public view already exist; needs the public page, a Services banner, a menu item that appears only when an animal is offered, and an inquiry button that opens Contact with the animal chosen
- [x] **A proper text editor** (bold, links, lists, photos in text), needed first by the blog
- [x] **Search engines**: an owner-editable meta title and description for every page, a share image, `sitemap.xml`, `robots.txt`, canonical addresses, and a clear "go live" step that turns indexing on and removes the "Preview site" banner
- [ ] **Real content and no sample content**: ranch photos, About text, animals; delete the sample animals and bracketed placeholder text
- [~] ⚠ **Custom domain**: steps are written down in `docs/launch-guide.md`; connecting each ranch's domain is still a manual step
- [ ] **Phone and accessibility pass** on every public page and admin screen (tap sizes, text contrast, keyboard use, screen-reader labels), plus a speed check
- [~] **Privacy page** done (linked from the footer, worded from what the site actually collects); a terms page is not needed until the site takes orders linked from the footer (the Contact form collects names and emails)
- [x] **People and access**: invite an editor or a second owner from the admin (Team screen)
- [~] **Backups and recovery**: how to check and restore is in `docs/launch-guide.md`; ⚠ confirm the project's backups are on
- [ ] **Error tracking and simple analytics**, so a broken page or a quiet week is noticed

## Should have (soon after launch)

- [x] Gallery page and its admin screen
- [x] FAQs page and its admin screen
- [ ] A screen to choose which categories and pages a ranch offers (today only a database change)
- [ ] Owner guide: short help text in the admin, a first-login checklist, a short video
- [ ] A second ranch set up from scratch with the provisioning steps, to prove the template really is reusable
- [ ] Automated end-to-end tests of the main flows (add an animal, import, contact form, for-sale filters) run on every push
- [ ] Decide on autosave for the safe fields of the animal form
- [ ] Pedigree Online / AllBreedPedigree import (waiting for their reply)
- [ ] Stronger spam protection (Turnstile and rate limiting service) if the simple checks aren't enough
- [ ] Hereford herd-extract import and "Move to My animals" for outside ancestors

## Later

- [ ] Newsletter sign-up, testimonials, reserving or deposits on an animal, printable pedigree sheet, another language, per-animal share cards

## Next phase (see docs/roadmap.md)

- [ ] Answer-engine layer: structured data on every page type, "Quick answers" from real facts on animal pages, FAQ page, `llms.txt`
- [ ] Tap-to-call and a sticky Inquire button on animal pages; simple analytics for inquiries
- [ ] Modern feel: scroll reveals, light parallax, page transitions, all optional for reduced motion
- [ ] Setup wizard: a guided interview that drafts headlines, About text, Contact wording, meta descriptions and brand style from the owner's own answers
