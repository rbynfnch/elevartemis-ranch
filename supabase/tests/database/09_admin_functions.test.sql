-- Atomic admin operations run with the owner's permissions.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'a@fn.test'), ('00000000-0000-4000-8000-0000000000b1', 'b@fn.test');
insert into public.ranches (id, slug, name) values
  ('00000000-0000-4000-8000-00000000000a', 'fn-a', 'A'), ('00000000-0000-4000-8000-00000000000b', 'fn-b', 'B');
insert into public.ranch_memberships (ranch_id, user_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000b1');
insert into public.animals (id, ranch_id, species, category_id, name, sex) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Mare', 'female');
insert into public.animal_facts (ranch_id, animal_id, label, value) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001', 'Old', 'fact');
insert into public.media (id, ranch_id, status) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-00000000000a', 'ready'),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-00000000000a', 'ready');
insert into public.animal_media (ranch_id, animal_id, media_id, sort_order) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000f1', 1),
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000f2', 2);

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';

select lives_ok($$ select public.replace_animal_details('00000000-0000-4000-8000-000000000001',
  '[{"label":"Height","value":"15.1 hh"},{"label":"Discipline","value":"Barrel racing"}]',
  '[{"heading":"Breeding notes","body":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Notes"}]}]}}]') $$,
  'The owner replaces facts and sections');
select results_eq($$ select label from public.animal_facts where animal_id = '00000000-0000-4000-8000-000000000001' order by sort_order $$,
  $$ values ('Height'::text), ('Discipline') $$, 'Facts are replaced, in order');
select throws_ok($$ select public.replace_animal_details('00000000-0000-4000-8000-000000000001', '[{"label":"Height","value":"  "}]', '[]') $$,
  '23514', null, 'A bad fact rolls back the whole save');
select is((select count(*)::int from public.animal_facts where animal_id = '00000000-0000-4000-8000-000000000001'), 2,
  '…leaving the previous facts intact (nothing lost)');

select lives_ok($$ select public.reorder_animal_photos('00000000-0000-4000-8000-000000000001',
  array['00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000f1']::uuid[]) $$, 'The owner reorders photos');
select results_eq($$ select media_id from public.animal_media where animal_id = '00000000-0000-4000-8000-000000000001' order by sort_order $$,
  $$ values ('00000000-0000-4000-8000-0000000000f2'::uuid), ('00000000-0000-4000-8000-0000000000f1') $$, 'The new order is saved');

set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000b1", "role": "authenticated"}';
select throws_ok($$ select public.replace_animal_details('00000000-0000-4000-8000-000000000001', '[]', '[]') $$,
  'RA016', null, 'Another ranch''s owner cannot touch this animal');

reset role;
select * from finish();
rollback;
