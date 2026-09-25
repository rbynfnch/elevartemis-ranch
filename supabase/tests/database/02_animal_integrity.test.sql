-- Animal integrity: categories, parentage, loops, slugs, photos, sale rules.
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

insert into public.ranches (id, slug, name, enabled_species) values
  ('00000000-0000-4000-8000-00000000000a', 'integrity', 'Integrity Ranch', '{horse,cattle}');

-- Grandsire → Sire → Colt, plus a mare and a bull
insert into public.animals (id, ranch_id, species, category_id, name, sex) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'horse',  'horse.stallion', 'Grandsire', 'male'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000a', 'horse',  'horse.mare',     'Mare One',  'female'),
  ('00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-00000000000a', 'cattle', 'cattle.bull',    'Big Bull',  'male');
insert into public.animals (id, ranch_id, species, category_id, name, sex, sire_id) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.stallion', 'Sire', 'male',
   '00000000-0000-4000-8000-000000000001');
insert into public.animals (id, ranch_id, species, category_id, name, sex, sire_id, dam_id) values
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.foal', 'Colt', 'male',
   '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003');

-- ─── Categories and sex ──────────────────────────────────────────────────────
select throws_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'cattle', 'horse.mare', 'Wrong', 'female') $$,
  'RA001', null, 'A horse category cannot be used for cattle');
select throws_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.stallion', 'Wrong', 'female') $$,
  'RA002', null, 'A stallion cannot be female');
select throws_ok($$ insert into public.animals (ranch_id, species, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'No Category', 'female') $$,
  '23514', null, 'A ranch animal needs a category');
select lives_ok($$ insert into public.animals (ranch_id, species, record_scope, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'pedigree_only', 'Outside Mare', 'female') $$,
  'An outside ancestor needs no category');

-- ─── Parentage ───────────────────────────────────────────────────────────────
select throws_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex, sire_id)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.foal', 'Bad', 'female',
          '00000000-0000-4000-8000-000000000003') $$,
  'RA003', null, 'A mare cannot be a sire');
select throws_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex, dam_id)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.foal', 'Bad', 'female',
          '00000000-0000-4000-8000-000000000001') $$,
  'RA004', null, 'A stallion cannot be a dam');
select throws_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex, sire_id)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.foal', 'Bad', 'female',
          '00000000-0000-4000-8000-000000000009') $$,
  'RA006', null, 'A bull cannot sire a foal');
select throws_ok($$ update public.animals set sire_id = id where id = '00000000-0000-4000-8000-000000000002' $$,
  'RA007', null, 'An animal cannot be its own sire');
select throws_ok($$ update public.animals set sire_id = '00000000-0000-4000-8000-000000000004'
  where id = '00000000-0000-4000-8000-000000000001' $$,
  'RA007', null, 'A grandchild cannot become the grandsire''s sire (no loops)');
select lives_ok($$ update public.animals set sex = 'gelding', category_id = 'horse.gelding'
  where id = '00000000-0000-4000-8000-000000000002' $$,
  'A sire can later be recorded as a gelding');
select throws_ok($$ update public.animals set sex = 'female', category_id = 'horse.mare'
  where id = '00000000-0000-4000-8000-000000000002' $$,
  'RA008', null, 'A recorded sire cannot become female');
select throws_ok($$ update public.animals set sex = 'male', category_id = 'horse.stallion'
  where id = '00000000-0000-4000-8000-000000000003' $$,
  'RA008', null, 'A recorded dam must stay female');

-- ─── Birth dates ─────────────────────────────────────────────────────────────
insert into public.animals (id, ranch_id, species, category_id, name, sex, birth_date, birth_precision) values
  ('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.foal', 'Year Only', 'female', '2026-07-19', 'year');
select is((select birth_date from public.animals where id = '00000000-0000-4000-8000-000000000005'), '2026-01-01'::date,
  'Year-only birth dates are stored as January 1');
select is((select birth_year from public.animals where id = '00000000-0000-4000-8000-000000000005'), 2026,
  'birth_year is derived automatically');

-- ─── Slugs and old URLs ──────────────────────────────────────────────────────
insert into public.animals (id, ranch_id, species, category_id, name, sex) values
  ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Blue Star''s Café', 'female'),
  ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Blue Star''s Café', 'female');
select is((select slug from public.animals where id = '00000000-0000-4000-8000-000000000006'), 'blue-stars-cafe',
  'Slugs are generated from the name');
select is((select slug from public.animals where id = '00000000-0000-4000-8000-000000000007'), 'blue-stars-cafe-2',
  'Duplicate names get a unique slug');
update public.animals set slug = 'blue-star' where id = '00000000-0000-4000-8000-000000000006';
update public.animals set is_published = true where id = '00000000-0000-4000-8000-000000000006';
select results_eq(
  $$ select slug, is_redirect from public.resolve_animal_slug('00000000-0000-4000-8000-00000000000a', 'blue-stars-cafe') $$,
  $$ values ('blue-star'::text, true) $$,
  'Renaming keeps the old URL as a redirect');

-- ─── Photos ──────────────────────────────────────────────────────────────────
insert into public.media (id, ranch_id, status) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a', 'ready'),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-00000000000a', 'ready'),
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-00000000000a', 'ready');
insert into public.animal_media (ranch_id, animal_id, media_id, sort_order) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000f1', 1),
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000f2', 2);
select is((select primary_media_id from public.animals where id = '00000000-0000-4000-8000-000000000003'),
  '00000000-0000-4000-8000-0000000000f1'::uuid, 'The first photo becomes the main photo');
select throws_ok($$ update public.animals set primary_media_id = '00000000-0000-4000-8000-0000000000f3'
  where id = '00000000-0000-4000-8000-000000000003' $$,
  'RA010', null, 'The main photo must belong to the animal');
delete from public.animal_media where media_id = '00000000-0000-4000-8000-0000000000f1';
select is((select primary_media_id from public.animals where id = '00000000-0000-4000-8000-000000000003'),
  '00000000-0000-4000-8000-0000000000f2'::uuid, 'Removing the main photo promotes the next one');
delete from public.media where id = '00000000-0000-4000-8000-0000000000f2';
select is((select primary_media_id from public.animals where id = '00000000-0000-4000-8000-000000000003'),
  null, 'Deleting the last photo clears the main photo');

-- ─── Sale listings ───────────────────────────────────────────────────────────
select throws_ok($$ insert into public.sale_listings (animal_id, ranch_id)
  select id, ranch_id from public.animals where name = 'Outside Mare' $$,
  'RA005', null, 'Outside ancestors cannot be listed for sale');
select throws_ok($$ insert into public.sale_listings (animal_id, ranch_id, price_mode)
  values ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000a', 'price') $$,
  '23514', null, 'Showing a price requires a price');
insert into public.sale_listings (animal_id, ranch_id) values
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000a');
update public.sale_listings set status = 'sold' where animal_id = '00000000-0000-4000-8000-000000000003';
select is((select sold_on from public.sale_listings where animal_id = '00000000-0000-4000-8000-000000000003'),
  current_date, 'Marking sold records the sale date');
update public.sale_listings set status = 'available' where animal_id = '00000000-0000-4000-8000-000000000003';
select is((select sold_on from public.sale_listings where animal_id = '00000000-0000-4000-8000-000000000003'),
  null, 'Returning to available clears the sale date');

-- ─── Outside ancestor promoted to ranch animal ───────────────────────────────
insert into public.animals (id, ranch_id, species, record_scope, name, sex) values
  ('00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-00000000000a', 'horse', 'pedigree_only', 'Famous Stallion', 'male');
insert into public.animals (ranch_id, species, category_id, name, sex, sire_id) values
  ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.foal', 'By Famous', 'male', '00000000-0000-4000-8000-000000000008');
select throws_ok($$ update public.animals set record_scope = 'inventory' where id = '00000000-0000-4000-8000-000000000008' $$,
  '23514', null, 'Promoting an outside ancestor requires a category');
select lives_ok($$ update public.animals set record_scope = 'inventory', category_id = 'horse.stallion'
  where id = '00000000-0000-4000-8000-000000000008' $$,
  'An outside ancestor can be added to the ranch''s animals');
select is((select count(*)::int from public.animals where sire_id = '00000000-0000-4000-8000-000000000008'), 1,
  'Promotion keeps the same record, so offspring links are intact');

-- ─── Empty rich text is never stored ─────────────────────────────────────────
select throws_ok($$ update public.animals set description = '{"type":"doc","content":[{"type":"paragraph"}]}'
  where id = '00000000-0000-4000-8000-000000000003' $$,
  '23514', null, 'An empty description document is rejected (store NULL instead)');
select throws_ok($$ insert into public.animal_facts (ranch_id, animal_id, label, value)
  values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000003', 'Height', '   ') $$,
  '23514', null, 'A fact with a blank value is rejected');

-- ─── Homepage slides ─────────────────────────────────────────────────────────
insert into public.hero_slides (ranch_id, headline) values
  ('00000000-0000-4000-8000-00000000000a', 'One'),
  ('00000000-0000-4000-8000-00000000000a', 'Two'),
  ('00000000-0000-4000-8000-00000000000a', 'Three');
select throws_ok($$ insert into public.hero_slides (ranch_id, headline) values ('00000000-0000-4000-8000-00000000000a', 'Four') $$,
  'RA011', null, 'No more than 3 active slides');
select lives_ok($$ insert into public.hero_slides (ranch_id, headline, is_active)
  values ('00000000-0000-4000-8000-00000000000a', 'Four (off)', false) $$,
  'Extra slides can be saved switched off');

select * from finish();
rollback;
