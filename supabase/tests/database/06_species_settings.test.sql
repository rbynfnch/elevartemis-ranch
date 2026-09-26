-- Per-ranch category choices (e.g. Cattle → Herefords → Bulls, Yearlings, Cows, For Sale).
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000a1', 'owner@species.test');
insert into public.ranches (id, slug, name, enabled_species) values
  ('00000000-0000-4000-8000-00000000000a', 'species', 'Species Ranch', '{horse,cattle}'),
  ('00000000-0000-4000-8000-00000000000b', 'horses-only', 'Horses Only', '{horse}');
insert into public.ranch_memberships (ranch_id, user_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1');

select is((select label_plural from public.animal_categories where id = 'cattle.yearling'), 'Yearlings',
  'Cattle have a Yearlings category');

insert into public.animals (ranch_id, species, category_id, name, sex) values
  ('00000000-0000-4000-8000-00000000000a', 'cattle', 'cattle.calf', 'Early Calf', 'female');
select throws_ok($$ insert into public.ranch_species_settings (ranch_id, species, categories)
  values ('00000000-0000-4000-8000-00000000000a', 'cattle', '{cattle.bull,cattle.yearling,cattle.cow}') $$,
  'RA013', null, 'A category still in use cannot be removed');
update public.animals set category_id = 'cattle.yearling' where name = 'Early Calf';

select lives_ok($$ insert into public.ranch_species_settings (ranch_id, species, breed_heading, categories, show_sold, show_retired, show_reference)
  values ('00000000-0000-4000-8000-00000000000a', 'cattle', 'Herefords', '{cattle.bull,cattle.yearling,cattle.cow}', false, false, false) $$,
  'Elevartemis can set Herefords: Bulls, Yearlings, Cows');
select results_eq($$ select categories from public.ranch_species_settings where ranch_id = '00000000-0000-4000-8000-00000000000a' $$,
  $$ values ('{cattle.bull,cattle.yearling,cattle.cow}'::text[]) $$, 'The order is kept as given');
select throws_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'cattle', 'cattle.steer', 'Steer', 'steer') $$,
  'RA013', null, 'Animals can only use categories the ranch offers');
select lives_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.gelding', 'Gelding', 'gelding') $$,
  'A species without settings keeps every platform category');
select throws_ok($$ update public.ranch_species_settings set categories = '{cattle.bull,horse.mare}'
  where ranch_id = '00000000-0000-4000-8000-00000000000a' $$, 'RA013', null, 'Categories must belong to the species');
select throws_ok($$ update public.ranch_species_settings set categories = '{cattle.bull,cattle.bull,cattle.yearling}'
  where ranch_id = '00000000-0000-4000-8000-00000000000a' $$, 'RA013', null, 'A category cannot be listed twice');
select throws_ok($$ insert into public.ranch_species_settings (ranch_id, species)
  values ('00000000-0000-4000-8000-00000000000b', 'cattle') $$, 'RA013', null, 'Settings only for species the ranch raises');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select throws_ok($$ update public.ranch_species_settings set breed_heading = 'Angus' $$,
  '42501', null, 'Owners cannot change the navigation structure');
reset role;
set local role anon;
select is((select breed_heading from public.ranch_species_settings where ranch_id = '00000000-0000-4000-8000-00000000000a'),
  'Herefords', 'Visitors (the public site) can read it');

reset role;
select * from finish();
rollback;
