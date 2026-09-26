-- Cattle performance records.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.ranches (id, slug, name, enabled_species) values
  ('00000000-0000-4000-8000-00000000000a', 'perf', 'Perf Ranch', '{horse,cattle}');
insert into public.animals (id, ranch_id, species, category_id, name, sex, is_published) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'cattle', 'cattle.bull', 'Bull', 'male', true),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Mare', 'female', true);

select lives_ok($$ insert into public.cattle_performance (animal_id, ranch_id, birth_weight_lb, weaning_weight_adj_lb, epds, epds_as_of)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 78, 640,
          '[{"trait":"BW","value":1.2}]', '2026-09-01') $$, 'A bull can have weights and EPDs');
select throws_ok($$ insert into public.cattle_performance (animal_id, ranch_id, birth_weight_lb)
  values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 80) $$,
  'RA015', null, 'Horses don''t get cattle performance records');
select throws_ok($$ update public.cattle_performance set epds_as_of = null
  where animal_id = '00000000-0000-4000-8000-000000000001' $$, '23514', null, 'EPDs need an "as of" date');
select throws_ok($$ update public.cattle_performance set birth_weight_lb = 780
  where animal_id = '00000000-0000-4000-8000-000000000001' $$, '23514', null, 'Implausible weights are caught (780 lb birth weight)');

update public.animals set is_published = false where id = '00000000-0000-4000-8000-000000000001';
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select is_empty($$ select 1 from public.cattle_performance $$, 'Performance of hidden animals stays private');
reset role;
select * from finish();
rollback;
