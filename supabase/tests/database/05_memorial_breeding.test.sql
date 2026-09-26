-- In Memory, category overrides, and Breeding Services.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000a1', 'owner@breeding.test');
insert into public.ranches (id, slug, name) values ('00000000-0000-4000-8000-00000000000a', 'breeding', 'Breeding Ranch');
insert into public.ranch_memberships (ranch_id, user_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1');
insert into public.animals (id, ranch_id, species, category_id, name, sex, birth_date, birth_precision, program_status, is_published, breeding_available) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.stallion', 'Stud', 'male', '2010-01-01', 'year', 'active', true, true),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Old Mare', 'female', '1998-01-01', 'year', 'deceased', true, false),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.gelding', 'Gelding', 'gelding', null, 'day', 'active', true, false),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.foal', 'Yearling', 'female', '2025-01-01', 'year', 'active', true, false);

-- ─── In Memory ───────────────────────────────────────────────────────────────
update public.animals set deceased_on = '2024-06-15' where id = '00000000-0000-4000-8000-000000000002';
select is((select deceased_on from public.animals where id = '00000000-0000-4000-8000-000000000002'), '2024-01-01'::date,
  'A year-only date of death is stored as January 1');
select ok((select on_memorial_page from public.public_animal_cards where id = '00000000-0000-4000-8000-000000000002'),
  'A deceased animal appears on the In Memory page');
select results_eq(
  $$ select bucket, total from public.public_nav_counts('00000000-0000-4000-8000-00000000000a') where bucket = 'memorial' $$,
  $$ values ('memorial'::text, 1) $$, 'Navigation counts include In Memory');
update public.animals set program_status = 'active', category_id = 'horse.mare' where id = '00000000-0000-4000-8000-000000000002';
select is((select deceased_on from public.animals where id = '00000000-0000-4000-8000-000000000002'), null,
  'Un-marking deceased clears the date of death');
select throws_ok($$ update public.animals set program_status = 'deceased', deceased_on = '1990-01-01', deceased_precision = 'day'
  where id = '00000000-0000-4000-8000-000000000002' $$, '23514', null, 'Date of death cannot precede birth');

-- ─── Owner overrides the suggested reclassification ──────────────────────────
update public.animals set category_confirmed_at = now() where id = '00000000-0000-4000-8000-000000000004';
select isnt((select category_confirmed_at from public.animals where id = '00000000-0000-4000-8000-000000000004'), null,
  'The owner can confirm an animal stays in its category');
update public.animals set category_id = 'horse.young_horse' where id = '00000000-0000-4000-8000-000000000004';
select is((select category_confirmed_at from public.animals where id = '00000000-0000-4000-8000-000000000004'), null,
  'Changing the category resets the confirmation');

-- ─── Breeding Services ───────────────────────────────────────────────────────
select lives_ok($$ insert into public.breeding_services (animal_id, ranch_id, status, service_types, stud_fee_cents)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'available', '{cooled,frozen}', 150000) $$,
  'A stallion can have breeding services, every field optional');
select throws_ok($$ insert into public.breeding_services (animal_id, ranch_id)
  values ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000a') $$,
  'RA012', null, 'A gelding cannot have breeding services');
select throws_ok($$ update public.breeding_services set service_types = '{carrier_pigeon}'
  where animal_id = '00000000-0000-4000-8000-000000000001' $$, '23514', null, 'Service types come from a fixed list');
select throws_ok($$ update public.breeding_services set service_type_other = 'Embryo transfer'
  where animal_id = '00000000-0000-4000-8000-000000000001' $$, '23514', null, 'An "other" description needs the Other type');
select throws_ok($$ update public.breeding_services set shipping_info = '{"type":"doc","content":[{"type":"paragraph"}]}'
  where animal_id = '00000000-0000-4000-8000-000000000001' $$, '23514', null, 'Empty rich text is never stored');
select throws_ok($$ update public.animals set sex = 'gelding', category_id = 'horse.gelding'
  where id = '00000000-0000-4000-8000-000000000001' $$, 'RA012', null, 'A breeding stallion cannot silently become a gelding');

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select is((select breeding_status::text from public.public_animal_cards where id = '00000000-0000-4000-8000-000000000001'), 'available',
  'The public card carries the breeding status for the badge');
select isnt_empty($$ select 1 from public.public_breeding_services where animal_id = '00000000-0000-4000-8000-000000000001' $$,
  'The stallion is ready for a future Stallion Services page');

reset role;
update public.animals set is_published = false where id = '00000000-0000-4000-8000-000000000001';
set local role anon;
select is_empty($$ select 1 from public.breeding_services where animal_id = '00000000-0000-4000-8000-000000000001' $$,
  'Breeding details of hidden animals stay private');

reset role;
select * from finish();
rollback;
