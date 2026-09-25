-- Pedigree, automatic offspring, and the public listing rules.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000a1', 'owner@pedigree.test');
insert into public.ranches (id, slug, name) values ('00000000-0000-4000-8000-00000000000a', 'pedigree', 'Pedigree Ranch');
insert into public.ranch_memberships (ranch_id, user_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1');

-- Outside grandsire (with notes) and outside granddam
insert into public.animals (id, ranch_id, species, record_scope, name, sex, description) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-00000000000a', 'horse', 'pedigree_only', 'Outside Grandsire', 'male',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Notes"}]}]}'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-00000000000a', 'horse', 'pedigree_only', 'Outside Granddam', 'female', null);
-- Ranch stallion (public) and ranch mare (draft)
insert into public.animals (id, ranch_id, species, category_id, name, sex, sire_id, dam_id, is_published) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.stallion', 'Big Red', 'male',
   '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000012', true),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Hidden Mare', 'female',
   '00000000-0000-4000-8000-000000000011', null, false);
-- Offspring across two years
insert into public.animals (id, ranch_id, species, category_id, name, sex, birth_date, birth_precision, sire_id, dam_id, is_published) values
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.foal', 'Foal 2026', 'female', '2026-04-01', 'day',
   '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', true),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.foal', 'Foal 2025', 'male', '2025-01-01', 'year',
   '00000000-0000-4000-8000-000000000001', null, true),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.foal', 'Draft Foal', 'male', '2026-01-01', 'year',
   '00000000-0000-4000-8000-000000000001', null, false);

-- ─── Pedigree (visitor) ──────────────────────────────────────────────────────
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select results_eq(
  $$ select path, name from public.get_pedigree('00000000-0000-4000-8000-000000000021') order by generation, path $$,
  $$ values (''::text, 'Foal 2026'::text), ('D', 'Hidden Mare'), ('S', 'Big Red'), ('DS', 'Outside Grandsire'),
            ('SD', 'Outside Granddam'), ('SS', 'Outside Grandsire') $$,
  'The pedigree walks both lines, shows linebreeding, and omits unknown ancestors');
select is((select is_linkable from public.get_pedigree('00000000-0000-4000-8000-000000000021') where path = 'S'), true,
  'A published ranch sire links to his portfolio');
select is((select is_linkable from public.get_pedigree('00000000-0000-4000-8000-000000000021') where path = 'D'), false,
  'An unpublished dam shows her name but no link');
select is((select is_linkable from public.get_pedigree('00000000-0000-4000-8000-000000000021') where path = 'SS'), false,
  'An outside ancestor has no portfolio link');
select isnt((select notes from public.get_pedigree('00000000-0000-4000-8000-000000000021') where path = 'SS'), null,
  'An outside ancestor''s notes are available for the pedigree card');
select is((select notes from public.get_pedigree('00000000-0000-4000-8000-000000000021') where path = 'S'), null,
  'Ranch animals don''t leak their description through the pedigree');
select is_empty($$ select 1 from public.get_pedigree('00000000-0000-4000-8000-000000000002') $$,
  'Visitors cannot fetch the pedigree of an unpublished animal');
select is((select max(generation) from public.get_pedigree('00000000-0000-4000-8000-000000000021', 1)), 1,
  'The generation limit is respected');

-- ─── Offspring (visitor) ─────────────────────────────────────────────────────
select results_eq(
  $$ select name, birth_year from public.get_offspring('00000000-0000-4000-8000-000000000001') $$,
  $$ values ('Foal 2026'::text, 2026), ('Foal 2025', 2025) $$,
  'Offspring appear automatically, newest year first, drafts hidden from visitors');
select is((select parent_role from public.get_offspring('00000000-0000-4000-8000-000000000001') limit 1), 'sire',
  'Offspring know which parent role the animal played');
select is((select other_parent_name from public.get_offspring('00000000-0000-4000-8000-000000000001') where name = 'Foal 2026'),
  'Hidden Mare', 'Offspring show the other parent''s name');
select is((select other_parent_linkable from public.get_offspring('00000000-0000-4000-8000-000000000001') where name = 'Foal 2026'),
  false, 'The other parent links only when public');
select is_empty($$ select 1 from public.get_offspring('00000000-0000-4000-8000-000000000002') $$,
  'Visitors cannot list offspring of an unpublished animal');

-- ─── Owner view ──────────────────────────────────────────────────────────────
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select is((select count(*)::int from public.get_offspring('00000000-0000-4000-8000-000000000001')), 3,
  'The owner also sees unpublished offspring');
select isnt_empty($$ select 1 from public.get_pedigree('00000000-0000-4000-8000-000000000002') $$,
  'The owner can view the pedigree of an unpublished animal');
select is((select count(*)::int from public.get_offspring('00000000-0000-4000-8000-000000000012')), 1,
  'The owner can list offspring of an outside ancestor');

-- ─── Listing rules ───────────────────────────────────────────────────────────
reset role;
insert into public.animals (id, ranch_id, species, category_id, name, sex, program_status, is_published) values
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'For Sale Mare', 'female', 'active', true),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Retired Mare', 'female', 'retired', true),
  ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Late Mare', 'female', 'deceased', true);
insert into public.sale_listings (animal_id, ranch_id) values
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-00000000000a');

set local role anon;
select ok((select on_category_page and on_for_sale_page from public.public_animal_cards
           where id = '00000000-0000-4000-8000-000000000031'),
  'An available animal appears in its category AND on For Sale');
select ok((select on_retired_page and not on_category_page from public.public_animal_cards
           where id = '00000000-0000-4000-8000-000000000032'),
  'A retired animal appears on Retired, not in its category');
select ok((select not (on_category_page or on_retired_page or on_for_sale_page or on_sold_page)
           from public.public_animal_cards where id = '00000000-0000-4000-8000-000000000033'),
  'A deceased animal appears on no list page');
select isnt_empty($$ select 1 from public.resolve_animal_slug('00000000-0000-4000-8000-00000000000a', 'late-mare') $$,
  'A deceased animal''s portfolio is still reachable');

reset role;
update public.sale_listings set status = 'sold' where animal_id = '00000000-0000-4000-8000-000000000031';
set local role anon;
select ok((select on_sold_page and not on_for_sale_page and not on_category_page
           from public.public_animal_cards where id = '00000000-0000-4000-8000-000000000031'),
  'A sold animal moves to Sold and leaves For Sale and its category');
select isnt_empty($$ select 1 from public.animals where id = '00000000-0000-4000-8000-000000000031' $$,
  'A sold animal keeps its public portfolio');

reset role;
update public.sale_listings set show_on_sold_page = false where animal_id = '00000000-0000-4000-8000-000000000031';
set local role anon;
select ok((select not on_sold_page from public.public_animal_cards where id = '00000000-0000-4000-8000-000000000031'),
  'The owner can keep a sold animal off the Sold page');

reset role;
update public.animals set archived_at = now() where id = '00000000-0000-4000-8000-000000000022';
set local role anon;
select is_empty($$ select 1 from public.public_animal_cards where id = '00000000-0000-4000-8000-000000000022' $$,
  'An archived animal disappears from listings');
select is_empty($$ select 1 from public.get_offspring('00000000-0000-4000-8000-000000000001') where name = 'Foal 2025' $$,
  'An archived animal disappears from offspring lists');

select results_eq(
  $$ select bucket, total from public.public_nav_counts('00000000-0000-4000-8000-00000000000a') order by bucket $$,
  $$ values ('foal'::text, 1), ('retired', 1), ('stallion', 1) $$,
  'Navigation counts include only non-empty buckets');

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select is_empty($$ select 1 from public.public_animal_cards where id = '00000000-0000-4000-8000-000000000023' $$,
  'Even the signed-in owner sees only public animals in the public view');

reset role;
select * from finish();
rollback;
