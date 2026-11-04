-- Height on animals and in the pedigree.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.ranches (id, slug, name) values ('00000000-0000-4000-8000-00000000000a', 'pedheight', 'Pedigree Height Ranch');
insert into public.animals (id, ranch_id, species, record_scope, name, sex, height, color) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-00000000000a', 'horse', 'pedigree_only', 'Magic Laughter', 'male', '16.0', 'blk');
insert into public.animals (id, ranch_id, species, category_id, name, sex, height, is_published) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Draft Mare', 'female', '15.2', false);
insert into public.animals (id, ranch_id, species, category_id, name, sex, sire_id, dam_id, height, is_published) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.stallion', 'Triple Blue Rose', 'male',
   '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', '15.3', true);

select throws_ok($$ update public.animals set height = repeat('9', 13) where id = '00000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'A height is kept to 12 characters');

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select is((select height from public.get_pedigree('00000000-0000-4000-8000-000000000001') where path = ''), '15.3',
  'A published animal shows its own height');
select is((select height from public.get_pedigree('00000000-0000-4000-8000-000000000001') where path = 'S'), '16.0',
  'An outside ancestor shows its height');
select is((select height from public.get_pedigree('00000000-0000-4000-8000-000000000001') where path = 'D'), null,
  'An unpublished ranch animal shows no height');
select is((select color from public.get_pedigree('00000000-0000-4000-8000-000000000001') where path = 'S'), 'blk',
  'Color still comes through');

select * from finish();
rollback;
