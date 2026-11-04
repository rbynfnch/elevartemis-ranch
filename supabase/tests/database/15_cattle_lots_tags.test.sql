-- Sale lots, ear tags, weights and what a price means.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.ranches (id, slug, name) values ('00000000-0000-4000-8000-00000000000a', 'cattlelots', 'Cattle Lots Ranch');
select is((select label_plural from public.animal_categories where id = 'cattle.lot'), 'Sale Lots', 'the Sale Lot category exists');

insert into public.animals (id, ranch_id, species, category_id, name, sex, ear_tag, weight_lb, head_count, is_published) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'cattle', 'cattle.lot', 'Feeder Steers', 'steer', '241', 1650, 12, true);
insert into public.sale_listings (animal_id, ranch_id, status, price_mode, price_cents, price_basis)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'available', 'price', 165000, 'per_head');

set local role anon;
select is((select head_count from public.public_animal_cards where name = 'Feeder Steers'), 12, 'a lot''s head count is on its card');
select is((select price_basis from public.public_animal_cards where name = 'Feeder Steers'), 'per_head', 'and what its price means');
select is((select ear_tag || ' ' || weight_lb from public.public_animal_cards where name = 'Feeder Steers'), '241 1650', 'ear tag and weight too');
reset role;

select throws_ok($$ update public.animals set head_count = 1 where name = 'Feeder Steers' $$, '23514', null, 'a head count of 1 is not a lot');
select throws_ok($$ update public.animals set weight_lb = 0 where name = 'Feeder Steers' $$, '23514', null, 'weight must be positive');
select throws_ok($$ update public.sale_listings set price_basis = 'each pound' $$, '23514', null, 'price basis is one of the three');

select * from finish();
rollback;
