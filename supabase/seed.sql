-- =============================================================================
-- LOCAL DEVELOPMENT SEED — never run against production.
--
-- Two ranches:
--   "Cottonwood Creek Ranch"  demo.localhost  — the demonstration ranch.
--       The ranch name, animals, posts and copy are ALL PLACEHOLDERS.
--       Every demo record has is_demo = true; square-bracketed copy marks text
--       the real ranch must supply.
--   "Second Test Ranch"       second.localhost — exists to prove isolation.
--
-- Local logins (password for both: ranch-demo-2026)
--   owner@demo.test    → Cottonwood Creek Ranch
--   owner@second.test  → Second Test Ranch
--
-- No photos are seeded here; `npm run seed:media` (Phase 5) uploads placeholders.
-- =============================================================================

-- Rich-text helper: each argument becomes a paragraph (Tiptap JSON).
create function pg_temp.doc(variadic paragraphs text[])
returns jsonb language sql immutable as $$
  select jsonb_build_object('type', 'doc', 'content', jsonb_agg(
    jsonb_build_object('type', 'paragraph', 'content',
      jsonb_build_array(jsonb_build_object('type', 'text', 'text', p)))))
  from unnest(paragraphs) as p;
$$;

-- ─── Users ───────────────────────────────────────────────────────────────────
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
values
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-000000000001', 'authenticated',
   'authenticated', 'owner@demo.test', extensions.crypt('ranch-demo-2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Demo Owner"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-000000000002', 'authenticated',
   'authenticated', 'owner@second.test', extensions.crypt('ranch-demo-2026', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Second Owner"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id in ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002');

-- ─── Ranches (settings rows are created by trigger) ──────────────────────────
insert into public.ranches (id, slug, name, status, enabled_species) values
  ('a0000000-0000-4000-8000-000000000001', 'cottonwood-creek', 'Cottonwood Creek Ranch', 'draft', '{horse,cattle}'),
  ('a0000000-0000-4000-8000-000000000002', 'second-test',      'Second Test Ranch',      'draft', '{horse}');

insert into public.ranch_domains (hostname, ranch_id, is_primary) values
  ('demo.localhost',   'a0000000-0000-4000-8000-000000000001', true),
  ('second.localhost', 'a0000000-0000-4000-8000-000000000002', true);

insert into public.ranch_memberships (ranch_id, user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'owner'),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'owner');

update public.ranch_branding set wordmark_text = 'Cottonwood Creek', wordmark_subtitle = 'Ranch', brand_mark = 'CC'
where ranch_id = 'a0000000-0000-4000-8000-000000000001';
update public.ranch_branding set wordmark_text = 'Second Test', wordmark_subtitle = 'Ranch', brand_mark = 'ST',
  font_preset = 'prairie'
where ranch_id = 'a0000000-0000-4000-8000-000000000002';

update public.ranch_profile set
  tagline = 'Horses and cattle, raised with care.',
  intro   = pg_temp.doc('[Welcome paragraph placeholder — two or three sentences from the ranch introducing who they are and what they raise.]')
where ranch_id = 'a0000000-0000-4000-8000-000000000001';

update public.ranch_private set inquiry_email = 'owner@demo.test'
where ranch_id = 'a0000000-0000-4000-8000-000000000001';
update public.ranch_private set inquiry_email = 'owner@second.test'
where ranch_id = 'a0000000-0000-4000-8000-000000000002';

update public.ranch_seo set default_description =
  '[Meta description placeholder — Elevartemis writes this at launch.]'
where ranch_id = 'a0000000-0000-4000-8000-000000000001';

insert into public.social_links (ranch_id, platform, url, sort_order) values
  ('a0000000-0000-4000-8000-000000000001', 'facebook',  'https://www.facebook.com/',  1),
  ('a0000000-0000-4000-8000-000000000001', 'instagram', 'https://www.instagram.com/', 2),
  ('a0000000-0000-4000-8000-000000000001', 'youtube',   'https://www.youtube.com/',   3);

update public.pages set sections = jsonb_build_array(
  jsonb_build_object('id', 'story', 'kind', 'text', 'heading', 'Our story', 'placeholder', true,
    'body', pg_temp.doc('[Ranch story — to be supplied by the ranch. How the ranch began, who runs it today, and what matters to them.]')),
  jsonb_build_object('id', 'philosophy', 'kind', 'image_text', 'heading', 'How we breed', 'placeholder', true,
    'body', pg_temp.doc('[Breeding philosophy — to be supplied by the ranch. What they select for and why.]')),
  jsonb_build_object('id', 'values', 'kind', 'quote', 'placeholder', true,
    'body', pg_temp.doc('[A short statement of the ranch''s values, in the owner''s own words.]')),
  jsonb_build_object('id', 'place', 'kind', 'text', 'heading', 'The land', 'placeholder', true,
    'body', pg_temp.doc('[Location and landscape — to be supplied by the ranch.]'))
)
where ranch_id = 'a0000000-0000-4000-8000-000000000001';

-- ─── Horses: outside ancestors (pedigree only) ───────────────────────────────
-- Parents are inserted before children so the integrity trigger can check them.
insert into public.animals (id, ranch_id, species, record_scope, name, sex, breed, is_demo) values
  ('c1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'horse', 'pedigree_only', 'Old Ironwood',       'male',   'Quarter Horse', true),
  ('c1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'horse', 'pedigree_only', 'Dusty Rose',         'female', 'Quarter Horse', true),
  ('c1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'horse', 'pedigree_only', 'Silver Creek Belle', 'female', null,            true),
  ('c1000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'horse', 'pedigree_only', 'Mesa Lark',          'female', null,            true);

insert into public.animals (id, ranch_id, species, record_scope, name, sex, breed, sire_id, dam_id, description, is_demo) values
  ('c1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'horse', 'pedigree_only',
   'Cimarron Gold', 'male', 'Quarter Horse',
   'c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002',
   pg_temp.doc('[Outside stallion notes placeholder — shown in the pedigree popover.]'), true);

-- ─── Horses: ranch animals ───────────────────────────────────────────────────
-- Columns: id, name, category, sex, birth_date, precision, sire, dam, program_status, featured, breeding, registry, reg #
insert into public.animals (id, ranch_id, species, category_id, name, sex, breed, color,
  birth_date, birth_precision, sire_id, dam_id, program_status, is_featured, breeding_available,
  registry, registration_number, description, is_published, is_demo, display_order)
values
  -- Previous stallion (reference) — linkable in pedigrees
  ('c1000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.stallion',
   'Canyon King', 'male', 'Quarter Horse', 'Sorrel', '1999-01-01', 'year', null, null, 'reference', false, false,
   null, null, pg_temp.doc('[Placeholder — the ranch''s own words about this stallion.]'), true, true, 0),
  -- Retired mare
  ('c1000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.mare',
   'Prairie Song', 'female', 'Quarter Horse', 'Bay', '2002-01-01', 'year', null,
   'c1000000-0000-4000-8000-000000000002', 'retired', false, false,
   null, null, null, true, true, 0),
  -- Senior stallion, featured, standing at stud
  ('c1000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.stallion',
   'Juniper Blue', 'male', 'Quarter Horse', 'Blue Roan', '2014-04-18', 'day',
   'c1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000004', 'active', true, true,
   null, null, pg_temp.doc('[Placeholder description — replace with the ranch''s own words about this horse: temperament, conformation, what he passes on.]'),
   true, true, 1),
  -- Second stallion, shows a registration number
  ('c1000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.stallion',
   'Red Mesa', 'male', 'Quarter Horse', 'Red Dun', '2016-01-01', 'year',
   'c1000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000005', 'active', false, true,
   '[Registry]', 'DEMO-0000', null, true, true, 2),
  -- Featured mare (by Canyon King out of Prairie Song — both linkable)
  ('c1000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.mare',
   'Sagebrush Lady', 'female', 'Quarter Horse', 'Buckskin', '2012-05-01', 'month',
   'c1000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000011', 'active', true, false,
   null, null, pg_temp.doc('[Placeholder description for this mare.]'), true, true, 1),
  -- Mare for sale
  ('c1000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.mare',
   'Willow Creek Maggie', 'female', 'Quarter Horse', 'Chestnut', '2015-01-01', 'year',
   'c1000000-0000-4000-8000-000000000001', null, 'active', false, false,
   null, null, null, true, true, 2);

-- Foals, young horse, gelding, sold, draft and archived examples
insert into public.animals (id, ranch_id, species, category_id, name, sex, breed, color,
  birth_date, birth_precision, sire_id, dam_id, program_status, is_published, archived_at, description, is_demo)
values
  ('c1000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.foal',
   'Blue Horizon', 'female', 'Quarter Horse', 'Blue Roan', '2026-04-02', 'day',
   'c1000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000014', 'active', true, null,
   pg_temp.doc('[Placeholder — a line or two about this foal.]'), true),
  ('c1000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.foal',
   'Mesa Spark', 'male', 'Quarter Horse', null, '2026-05-01', 'month',
   'c1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000015', 'active', true, null, null, true),
  -- 2025 foal: over a year old, so the admin dashboard will suggest moving it up
  ('c1000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.foal',
   'Little Juniper', 'male', 'Quarter Horse', null, '2025-01-01', 'year',
   'c1000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000015', 'active', true, null, null, true),
  ('c1000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.young_horse',
   'Sage Runner', 'gelding', 'Quarter Horse', 'Dun', '2023-01-01', 'year',
   'c1000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000014', 'active', true, null, null, true),
  -- Minimal record: no parents, no description — the portfolio shows only what exists
  ('c1000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.gelding',
   'Dusty Trail', 'gelding', null, null, null, 'day', null, null, 'active', true, null, null, true),
  ('c1000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.mare',
   'Copper Penny', 'female', 'Quarter Horse', 'Sorrel', '2018-01-01', 'year',
   'c1000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000014', 'active', true, null, null, true),
  ('c1000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.mare',
   'Unpublished Example', 'female', null, null, null, 'day', null, null, 'active', false, null, null, true),
  ('c1000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.gelding',
   'Archived Example', 'gelding', null, null, null, 'day', null, null, 'active', true, now(), null, true),
  -- In Memory example (dam of Prairie Song's line is outside; this mare is the ranch's own)
  ('c1000000-0000-4000-8000-000000000024', 'a0000000-0000-4000-8000-000000000001', 'horse', 'horse.mare',
   'Mesa Belle', 'female', 'Quarter Horse', 'Grulla', '1998-01-01', 'year', null, null, 'deceased', true, null,
   pg_temp.doc('[In Memory placeholder — the ranch''s own words about this mare.]'), true);

update public.animals set deceased_on = '2024-01-01', deceased_precision = 'year'
where id = 'c1000000-0000-4000-8000-000000000024';

insert into public.animal_facts (ranch_id, animal_id, label, value, sort_order) values
  ('a0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000012', 'Height',        '[e.g. 15.1 hh]', 1),
  ('a0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000012', 'Breeding terms', '[Placeholder — the ranch''s breeding terms]', 2);

insert into public.animal_sections (ranch_id, animal_id, heading, body, sort_order) values
  ('a0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000012', 'Breeding notes',
   pg_temp.doc('[Placeholder — an example of a free-form section the owner can add to any animal.]'), 1);

insert into public.sale_listings (animal_id, ranch_id, status, price_mode, location_text, sales_description) values
  ('c1000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001', 'available', 'contact', null,
   pg_temp.doc('[Sales description placeholder.]')),
  ('c1000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000001', 'pending',   'contact', null, null);
insert into public.sale_listings (animal_id, ranch_id, status, price_mode, sold_on) values
  ('c1000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000001', 'sold', 'hidden', '2026-06-15');

-- ─── Breeding services (placeholders: the ranch supplies fees, season, terms) ─
insert into public.breeding_services (animal_id, ranch_id, status, service_types, additional_terms, cta_label) values
  ('c1000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'available', '{cooled,frozen}',
   pg_temp.doc('[Breeding terms placeholder — the ranch supplies stud fee, season, shipping details and mare requirements.]'),
   'Ask about breeding');

-- ─── Cattle program: Cattle → Herefords → Bulls, Yearlings, Cows, For Sale ─
insert into public.ranch_species_settings
  (ranch_id, species, breed_heading, categories, show_retired, show_reference, show_for_sale, show_sold)
values
  ('a0000000-0000-4000-8000-000000000001', 'cattle', 'Herefords',
   '{cattle.bull,cattle.yearling,cattle.cow}', false, false, true, false);

-- ─── Cattle ──────────────────────────────────────────────────────────────────
insert into public.animals (id, ranch_id, species, record_scope, name, sex, breed, is_demo) values
  ('c2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'cattle', 'pedigree_only',
   'Highland Summit', 'male', 'Hereford', true);

insert into public.animals (id, ranch_id, species, category_id, name, sex, breed, birth_date, birth_precision,
  sire_id, dam_id, is_featured, species_attrs, is_published, is_demo)
values
  ('c2000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'cattle', 'cattle.bull',
   'CCR Anchor 401', 'male', 'Hereford', '2021-01-01', 'year', 'c2000000-0000-4000-8000-000000000001', null,
   true, '{"ear_tag": "401"}', true, true),
  -- Cows: in the database as dams (pedigrees, offspring) but not yet on the website.
  ('c2000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'cattle', 'cattle.cow',
   'CCR Blackbird 118', 'female', 'Hereford', '2018-01-01', 'year', null, null, false, '{"ear_tag": "118"}', false, true),
  ('c2000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'cattle', 'cattle.cow',
   'CCR Maybelle 207', 'female', 'Hereford', '2019-01-01', 'year', null, null, false, '{"ear_tag": "207"}', false, true),
  ('c2000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000001', 'cattle', 'cattle.bull',
   'CCR Ridge 309', 'male', 'Hereford', '2020-01-01', 'year', null, null, false, '{}', true, true);

insert into public.animals (id, ranch_id, species, category_id, name, sex, breed, birth_date, birth_precision,
  sire_id, dam_id, species_attrs, is_published, is_demo)
values
  ('c2000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'cattle', 'cattle.bull',
   'CCR Summit 512', 'male', 'Hereford', '2023-01-01', 'year',
   'c2000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000012', '{"ear_tag": "512"}', true, true),
  ('c2000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'cattle', 'cattle.yearling',
   'CCR Anchor 614', 'male', 'Hereford', '2025-03-10', 'day',
   'c2000000-0000-4000-8000-000000000010', 'c2000000-0000-4000-8000-000000000011', '{"ear_tag": "614"}', true, true),
  ('c2000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001', 'cattle', 'cattle.yearling',
   'CCR Maybelle 622', 'female', 'Hereford', '2025-03-22', 'day',
   'c2000000-0000-4000-8000-000000000010', 'c2000000-0000-4000-8000-000000000012', '{"ear_tag": "622"}', true, true),
  ('c2000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000001', 'cattle', 'cattle.yearling',
   'CCR Blackbird 530', 'female', 'Hereford', '2025-01-01', 'year',
   'c2000000-0000-4000-8000-000000000010', 'c2000000-0000-4000-8000-000000000011', '{"ear_tag": "530"}', true, true);

update public.animals set breeding_available = true where id = 'c2000000-0000-4000-8000-000000000010';
insert into public.breeding_services (animal_id, ranch_id, status, service_types) values
  ('c2000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'available', '{frozen}');

insert into public.sale_listings (animal_id, ranch_id, status, price_mode) values
  ('c2000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'available', 'contact');
insert into public.sale_listings (animal_id, ranch_id, status, price_mode, sold_on) values
  ('c2000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000001', 'sold', 'hidden', '2026-02-01');

-- ─── Homepage slides (photos arrive with seed:media) ─────────────────────────
insert into public.hero_slides (ranch_id, headline, subheadline, cta_label, cta_kind, cta_page,
  cta_category_id, cta_animal_id, sort_order, is_demo)
values
  ('a0000000-0000-4000-8000-000000000001', '[Headline placeholder]', '[Subheadline placeholder — one short sentence.]',
   'See our stallions', 'category', null, 'horse.stallion', null, 1, true),
  ('a0000000-0000-4000-8000-000000000001', 'Meet Juniper Blue', '[Placeholder line about this stallion.]',
   'View his portfolio', 'animal', null, null, 'c1000000-0000-4000-8000-000000000012', 2, true),
  ('a0000000-0000-4000-8000-000000000001', 'Horses and cattle for sale', '[Placeholder line about current sale animals.]',
   'See what''s for sale', 'page', 'for_sale', null, null, 3, true);

-- ─── What's Happening on the Ranch ───────────────────────────────────────────
insert into public.post_categories (id, ranch_id, name, slug, sort_order) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Foals',      'foals',      1),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Ranch life', 'ranch-life', 2);

insert into public.posts (id, ranch_id, title, excerpt, body, category_id, status, published_at, is_demo) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   '[Sample update] Welcome to the new website',
   '[Placeholder excerpt — one or two sentences shown on the homepage.]',
   pg_temp.doc('[Placeholder post body. The owner writes updates like this from the admin.]'),
   'd0000000-0000-4000-8000-000000000002', 'published', '2026-08-20 15:00:00+00', true),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   '[Sample update] Meet the 2026 foals',
   '[Placeholder excerpt about this year''s foals.]',
   pg_temp.doc('[Placeholder post body.]'),
   'd0000000-0000-4000-8000-000000000001', 'published', '2026-09-12 15:00:00+00', true),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   '[Sample draft] Not yet published', null, null, null, 'draft', null, true);

insert into public.post_animals (ranch_id, post_id, animal_id) values
  ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000016'),
  ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000017');

-- ─── FAQs ────────────────────────────────────────────────────────────────────
insert into public.faqs (ranch_id, question, answer, sort_order, is_demo) values
  ('a0000000-0000-4000-8000-000000000001', 'Can I visit the ranch?',
   pg_temp.doc('[Placeholder answer — to be supplied by the ranch.]'), 1, true),
  ('a0000000-0000-4000-8000-000000000001', 'Do you ship or deliver animals?',
   pg_temp.doc('[Placeholder answer — to be supplied by the ranch.]'), 2, true),
  ('a0000000-0000-4000-8000-000000000001', 'How do I ask about an animal for sale?',
   pg_temp.doc('Every animal''s page has a short form. Send a message there and it comes straight to us.'), 3, true),
  ('a0000000-0000-4000-8000-000000000001', 'Do you offer breeding services?',
   pg_temp.doc('[Placeholder answer — to be supplied by the ranch.]'), 4, true);

-- ─── Second ranch (isolation) ────────────────────────────────────────────────
insert into public.animals (id, ranch_id, species, category_id, name, sex, is_published) values
  ('c9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'horse', 'horse.stallion',
   'Isolation Test Stallion', 'male', true),
  ('c9000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'horse', 'horse.mare',
   'Second Ranch Draft Mare', 'female', false);
insert into public.posts (ranch_id, title, status) values
  ('a0000000-0000-4000-8000-000000000002', 'Second ranch draft post', 'draft');
