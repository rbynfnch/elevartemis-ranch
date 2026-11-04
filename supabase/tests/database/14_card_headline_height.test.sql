-- Listing cards carry the headline, height and registration of published animals.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into public.ranches (id, slug, name) values ('00000000-0000-4000-8000-00000000000a', 'cardhead', 'Card Headline Ranch');
insert into public.animals (id, ranch_id, species, category_id, name, sex, tagline, height, registry, registration_number, is_published) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Shown Mare', 'female',
   'Sure-footed and steady', '15.3hh', 'AQHA', '2706274', true),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Hidden Mare', 'female',
   'Not for the public', '15.0hh', 'AQHA', '999', false);

set local role anon;
select is((select tagline from public.public_animal_cards where ranch_id = '00000000-0000-4000-8000-00000000000a' and name = 'Shown Mare'),
  'Sure-footed and steady', 'a published animal''s headline is on its card');
select is((select height || ' ' || registry || ' #' || registration_number from public.public_animal_cards where name = 'Shown Mare'),
  '15.3hh AQHA #2706274', 'height and registration are on its card');
select is((select count(*)::int from public.public_animal_cards where name = 'Hidden Mare'), 0, 'an unpublished animal is still not on any card');

select * from finish();
rollback;
