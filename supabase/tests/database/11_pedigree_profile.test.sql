-- Pedigree cards show registration details; tagline and highlights are bounded.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.ranches (id, slug, name) values ('00000000-0000-4000-8000-00000000000a', 'pedprof', 'Pedigree Profile Ranch');
-- An outside sire with registration details, and an unpublished ranch dam with some too.
insert into public.animals (id, ranch_id, species, record_scope, name, sex, registry, registration_number) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-00000000000a', 'horse', 'pedigree_only', 'High Brow Cat', 'male', 'AQHA', '2706274');
insert into public.animals (id, ranch_id, species, category_id, name, sex, registry, registration_number, is_published) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Draft Mare', 'female', 'AQHA', '999', false);
insert into public.animals (id, ranch_id, species, category_id, name, sex, sire_id, dam_id, is_published) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.stallion', 'FW High Country', 'male',
   '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', true);

select lives_ok($$ update public.animals set tagline = 'A proven ranch gelding.', highlights = '{"Ranch Proven","Trail Ready"}'
  where id = '00000000-0000-4000-8000-000000000001' $$, 'An animal can have a tagline and up to four highlights');
select throws_ok($$ update public.animals set highlights = '{"a","b","c","d","e"}' where id = '00000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'More than four highlights is refused');
select throws_ok($$ update public.animals set tagline = repeat('x', 161) where id = '00000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'A tagline is kept to 160 characters');

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select is((select registration_number from public.get_pedigree('00000000-0000-4000-8000-000000000001') where path = 'S'), '2706274',
  'An outside ancestor shows its registration number');
select is((select registry from public.get_pedigree('00000000-0000-4000-8000-000000000001') where path = 'S'), 'AQHA',
  '…and its registry');
select is((select registration_number from public.get_pedigree('00000000-0000-4000-8000-000000000001') where path = 'D'), null,
  'An unpublished ranch animal shows no registration number');
select is((select name from public.get_pedigree('00000000-0000-4000-8000-000000000001') where path = 'D'), 'Draft Mare',
  '…but still shows its name in the pedigree');

reset role;
select * from finish();
rollback;
