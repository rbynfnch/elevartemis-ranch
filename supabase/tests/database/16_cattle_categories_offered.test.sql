-- Animals can use Sale Lot where the ranch offers every category.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into public.ranches (id, slug, name, enabled_species) values ('00000000-0000-4000-8000-00000000000a', 'catoffered', 'Categories Ranch', '{cattle}');
select lives_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex, head_count)
  values ('00000000-0000-4000-8000-00000000000a', 'cattle', 'cattle.lot', 'A Lot', 'steer', 12) $$, 'a Sale Lot can be added when the ranch offers all categories');

insert into public.ranch_species_settings (ranch_id, species, categories) values ('00000000-0000-4000-8000-00000000000a', 'cattle', '{cattle.bull,cattle.cow}');
select throws_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'cattle', 'cattle.steer', 'A Steer', 'steer') $$, 'RA013', null, 'but not when the ranch narrowed its list without it');

select * from finish();
rollback;
