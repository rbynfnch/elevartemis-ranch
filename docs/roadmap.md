# Roadmap: blog and SEO in the MVP, then the wizard, motion and answer-engine work

## What changes in the MVP

- **Blog is in the MVP.** Public name is the owner's choice per ranch ("Happening on the Ranch", "Experiences", "Ranch Life"). The database already has `posts`, `post_categories`, `post_media` and `post_animals`; what is missing is the admin editor, the public list and post pages, and the search-engine markup.
- **Search-engine basics are in the MVP** because the blog depends on them: a meta title and description for every page (owner-editable, with sensible defaults and length hints), a social share image, `sitemap.xml`, `robots.txt`, canonical addresses and the go-live switch.

## Which pages are brochure pages and which are action pages

| Page                                         | Job                                       | Type                                       | What it needs                                                                                                                        |
| -------------------------------------------- | ----------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Home                                         | Make the first impression, send people on | Brochure with two clear exits              | A short hero, one button to For Sale (or Contact), proof (a few animals, a line from the owner)                                      |
| About                                        | Build trust in the people                 | Brochure                                   | Story, photos, values; one quiet button to Contact                                                                                   |
| Horses / Cattle, category pages              | Show the program                          | Portfolio (catalogue)                      | Beautiful cards, easy to scan, link to For Sale from each                                                                            |
| Sold, Retired, Previous Stallions, In Memory | Prove the track record, honor the past    | Portfolio / legacy                         | Photos and pedigree; no sales pressure                                                                                               |
| Blog (Happenings / Experiences)              | Trust, fresh content, search traffic      | Brochure and discovery                     | Real stories with photos, linked animals, a closing "Ask us about…"                                                                  |
| Gallery                                      | Atmosphere                                | Brochure                                   | Fast, large images                                                                                                                   |
| **For Sale**                                 | Find an animal and decide                 | **Action funnel**                          | Search and filters (built), price shown the way the owner chose, one tap to the animal                                               |
| **Animal profile (for sale)**                | Convince                                  | **Action funnel, the most important page** | Photos, video, pedigree, registration, price, an Inquire button that stays in view on a phone, a tap-to-call button, related animals |
| **Contact**                                  | Send the message                          | **Action, single goal**                    | Short form (built), prefilled animal (built), a promise of when they'll hear back, phone number                                      |
| **Breeding services** (to build)             | Book a breeding                           | **Action funnel**                          | Fee, terms, availability, one inquiry button                                                                                         |

The journey to protect: _a search or an answer engine → an animal page or For Sale → evaluate (photos, video, pedigree, price) → Inquire with the animal prefilled → a quick reply._ Everything on those pages either helps a buyer decide or gets out of the way. Measure inquiries per visit, and inquiries per animal, once simple analytics are in.

## Search engines and answer engines

- **Meta descriptions:** every page has an owner-editable title and description. Defaults are written from the page's own content and flagged when too short or too long. The wizard (below) drafts them.
- **"SEO keywords":** search engines ignore the old keywords tag, so we will not rely on it. Instead each page gets a **focus phrase** (for example "registered Hereford bulls in Wyoming", typed by the owner) used as a writing guide: it appears in the title, the first paragraph and a heading, and the wizard checks for it.
- **Answer-engine design (AEO), built into the page templates:**
  - A short **plain answer** near the top of key pages: what the ranch raises, where, and how to buy.
  - **Structured data** (JSON-LD) on every page type: the ranch as a local business (name, place, phone, social links, logo), breadcrumbs, the listing pages as lists, each for-sale animal as an offer with its real price and availability, blog posts as articles, the FAQ as questions and answers, the About and Contact pages as such.
  - **Questions answered from real facts**: each animal page shows a small "Quick answers" block built only from what is recorded (age, height, registration, price, whether it is for sale, sire and dam), visible to people and marked up for answer engines. Nothing is invented.
  - A real **FAQ** page and short FAQs on key pages, written by the owner, marked up.
  - Consistent name, place and phone everywhere, descriptive alt text on photos, one clear heading structure per page, a sitemap, and an `llms.txt` summary of the site for AI tools.

## Blog (MVP)

- **Admin:** a posts list (drafts, published, scheduled date), an editor (title, summary, photos from the library, text, category, date that can be backdated to build the ranch's history, animals mentioned), a preview, and publish.
- **Public:** the list page (`/happenings` or the ranch's own word), category filter, post pages with a large photo, the story, "Animals in this story" cards linking to profiles, and previous/next. The Page Banners screen gets a banner for it.
- **Search and answers:** each post has a meta title, description and share image, article markup, and appears in the sitemap.
- **Needs first:** the proper text editor (bold, links, lists, photos inside text) is much more valuable here than anywhere else, so it joins the MVP with the blog.

## Phase 2: the setup wizard

A friendly interview on any device (phone first, speaking instead of typing allowed) that gets a new owner from nothing to a finished first draft of the site. The hard part for owners is putting their work into words, so the wizard asks small questions and does the first draft.

1. **The basics:** name, place, what they raise, how long.
2. **Their story, in small questions:** how it started, what they raise and why, what makes their animals different, what buyers say, what they value, a day on the ranch. Each answer is saved as they go; they can stop and continue later.
3. **What they want the site to do:** sell animals, book breedings, tell the story. This sets which buttons lead on the home page.
4. **Brand style:** a few mood questions and a choice between 4 to 6 ready-made looks (colors, fonts), plus a logo upload; a live preview as they pick.
5. **A first draft written from their answers:** headline and subheadline for every banner, the About text, the Contact page wording, the home page headline, meta descriptions and focus phrases, a starter FAQ. It uses only what they said; anything it can't back up is left as a question for them. They edit anything and approve.
6. **A launch checklist** that ends in the go-live switch.

Notes: the drafting step needs an AI service key stored on the server (never in the repository), with a per-ranch limit; without it the wizard still works as a guided form with example wording. Every draft is shown as a draft until the owner approves it.

## Phase 2: a modern feel (motion and depth)

Principle: subtle, quick, purposeful, and always optional. Nothing may hurt speed or get in the way of the action pages.

- Gentle **scroll reveals** (fade and rise) for sections and cards, using CSS scroll-driven animation with a simple fallback.
- A very light **parallax** on banner photos and the photo band (a few percent of movement), only where the photo is decorative.
- **Page transitions** between pages where the browser supports them, a header that settles as you scroll, small button and card hover and press effects, image fade-in with the blur placeholder, skeletons instead of blank loading.
- Rules: everything switches off for people who prefer reduced motion; transforms and opacity only (no layout shift); no heavy animation library; checked against loading speed and responsiveness on a mid-range phone; none of it on form fields.

## Suggested order

1. **MVP, now:** the text editor, the blog (admin, public, article markup), per-page meta titles and descriptions, sitemap and robots, the Ranch Info screen, the Homepage editor, the go-live switch.
2. **Then:** the answer-engine layer on every page type (structured data, quick answers, FAQ page, `llms.txt`), tap-to-call and a sticky Inquire button on animal pages, simple analytics.
3. **Phase 2:** the motion layer, then the setup wizard.
