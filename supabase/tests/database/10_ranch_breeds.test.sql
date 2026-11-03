-- Breeds: each ranch's own list, kept in step with its animals.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'a@br.test'), ('00000000-0000-4000-8000-0000000000b1', 'b@br.test');
insert into public.ranches (id, slug, name) values
  ('00000000-0000-4000-8000-00000000000a', 'br-a', 'A'), ('00000000-0000-4000-8000-00000000000b', 'br-b', 'B');
insert into public.ranch_memberships (ranch_id, user_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000b1');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';

select lives_ok($$ insert into public.ranch_breeds (ranch_id, species, name)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'Quarter Horse') $$, 'The owner adds a breed');
select throws_ok($$ insert into public.ranch_breeds (ranch_id, species, name)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'quarter horse') $$,
  '23505', null, 'The same breed with different capitals is a duplicate');

-- Saving an animal keeps the list and the animal in step.
insert into public.animals (id, ranch_id, species, category_id, name, sex, breed) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Mare One', 'female', 'quarter horse');
select is((select breed from public.animals where id = '00000000-0000-4000-8000-000000000001'), 'Quarter Horse',
  'An animal typed in other capitals gets the list''s spelling');
insert into public.animals (id, ranch_id, species, category_id, name, sex, breed) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Mare Two', 'female', 'Appaloosa');
select is((select count(*)::int from public.ranch_breeds where ranch_id = '00000000-0000-4000-8000-00000000000a' and name = 'Appaloosa'), 1,
  'A new breed on an animal is added to the list');

-- Rename changes the list and every animal that uses it.
select lives_ok($$ select public.rename_breed((select id from public.ranch_breeds where name = 'Appaloosa'), 'Appaloosa Horse') $$,
  'The owner renames a breed');
select is((select breed from public.animals where id = '00000000-0000-4000-8000-000000000002'), 'Appaloosa Horse',
  '…and the animals using it follow');

-- In-use breeds can't be deleted; unused ones can.
select throws_ok($$ delete from public.ranch_breeds where name = 'Quarter Horse' $$,
  'RA017', null, 'A breed animals still use cannot be deleted');
select lives_ok($$ insert into public.ranch_breeds (ranch_id, species, name) values ('00000000-0000-4000-8000-00000000000a', 'cattle', 'Angus');
  delete from public.ranch_breeds where name = 'Angus' $$, 'An unused breed can be deleted');

-- Ranches never see each other's lists.
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000b1", "role": "authenticated"}';
select is((select count(*)::int from public.ranch_breeds), 0, 'Another ranch''s owner sees none of these breeds');
select throws_ok($$ select public.rename_breed((select id from public.ranch_breeds limit 1), 'X') $$,
  'RA017', null, 'Another ranch''s owner cannot rename them');

reset role;
select * from finish();
rollback;
