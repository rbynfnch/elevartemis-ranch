-- Cross-ranch isolation and authorization.
-- Run: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

-- ─── Fixtures (as table owner) ───────────────────────────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner-a@test.local'),
  ('00000000-0000-4000-8000-0000000000b1', 'owner-b@test.local'),
  ('00000000-0000-4000-8000-0000000000c1', 'nobody@test.local');

insert into public.ranches (id, slug, name, enabled_species) values
  ('00000000-0000-4000-8000-00000000000a', 'iso-a', 'Ranch A', '{horse}'),
  ('00000000-0000-4000-8000-00000000000b', 'iso-b', 'Ranch B', '{horse}');

insert into public.ranch_memberships (ranch_id, user_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000b1');

update public.ranch_private set inquiry_email = 'a@ranch-a.test' where ranch_id = '00000000-0000-4000-8000-00000000000a';
update public.ranch_private set inquiry_email = 'b@ranch-b.test' where ranch_id = '00000000-0000-4000-8000-00000000000b';

insert into public.animals (id, ranch_id, species, category_id, name, sex, is_published, archived_at) values
  ('00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.stallion', 'A Public Stallion', 'male',   true,  null),
  ('00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare',     'A Draft Mare',      'female', false, null),
  ('00000000-0000-4000-8000-000000000a03', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.gelding',  'A Archived',        'gelding', true, now()),
  ('00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-00000000000b', 'horse', 'horse.stallion', 'B Public Stallion', 'male',   true,  null),
  ('00000000-0000-4000-8000-000000000b02', '00000000-0000-4000-8000-00000000000b', 'horse', 'horse.mare',     'B Draft Mare',      'female', false, null);

insert into public.hero_slides (id, ranch_id, headline, is_active) values
  ('00000000-0000-4000-8000-000000000b51', '00000000-0000-4000-8000-00000000000b', 'B inactive slide', false);

insert into public.posts (ranch_id, title, status) values
  ('00000000-0000-4000-8000-00000000000b', 'B draft post', 'draft'),
  ('00000000-0000-4000-8000-00000000000b', 'B published post', 'published');

-- ─── Signed in as the owner of Ranch A ───────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated"}';

select is((select count(*)::int from public.animals where ranch_id = '00000000-0000-4000-8000-00000000000a'), 3,
  'Owner A sees all of their own animals, including draft and archived');
select is((select count(*)::int from public.animals where ranch_id = '00000000-0000-4000-8000-00000000000b'), 1,
  'Owner A sees only Ranch B''s PUBLIC animal, like any visitor');
select is_empty($$ select 1 from public.animals where id = '00000000-0000-4000-8000-000000000b02' $$,
  'Owner A cannot see Ranch B''s draft animal');

with u as (update public.animals set name = 'Hijacked' where id = '00000000-0000-4000-8000-000000000b01' returning 1)
select is(count(*)::int, 0, 'Owner A cannot edit Ranch B''s animal') from u;

with d as (delete from public.hero_slides where ranch_id = '00000000-0000-4000-8000-00000000000b' returning 1)
select is(count(*)::int, 0, 'Owner A cannot delete Ranch B''s slides') from d;

select throws_ok($$
  insert into public.animals (ranch_id, species, category_id, name, sex)
  values ('00000000-0000-4000-8000-00000000000b', 'horse', 'horse.mare', 'Planted', 'female') $$,
  '42501', null, 'Owner A cannot add an animal to Ranch B');

select throws_ok($$
  update public.animals set ranch_id = '00000000-0000-4000-8000-00000000000b'
  where id = '00000000-0000-4000-8000-000000000a01' $$,
  '42501', null, 'Owner A cannot move an animal into Ranch B');

select throws_ok($$
  update public.animals set sire_id = '00000000-0000-4000-8000-000000000b01'
  where id = '00000000-0000-4000-8000-000000000a02' $$,
  '23503', null, 'A sire from another ranch is rejected by the composite foreign key');

select is((select inquiry_email from public.ranch_private where ranch_id = '00000000-0000-4000-8000-00000000000a'),
  'a@ranch-a.test', 'Owner A can read their own inquiry email');
select is_empty($$ select 1 from public.ranch_private where ranch_id = '00000000-0000-4000-8000-00000000000b' $$,
  'Owner A cannot read Ranch B''s inquiry email');

with u as (update public.ranch_private set inquiry_email = 'evil@x.test'
           where ranch_id = '00000000-0000-4000-8000-00000000000b' returning 1)
select is(count(*)::int, 0, 'Owner A cannot change Ranch B''s inquiry email') from u;

select throws_ok($$ update public.ranch_seo set noindex = false where ranch_id = '00000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'Owners cannot change SEO settings (Elevartemis only)');
select throws_ok($$ update public.ranch_branding set font_preset = 'x' where ranch_id = '00000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'Owners cannot change branding (Elevartemis only)');
select throws_ok($$ update public.ranches set status = 'live' where id = '00000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'Owners cannot change ranch status');
select throws_ok($$ insert into public.ranch_memberships (ranch_id, user_id)
  values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a1') $$,
  '42501', null, 'Owners cannot grant themselves access to another ranch');
select throws_ok($$ insert into public.ranch_domains (hostname, ranch_id)
  values ('hijack.test', '00000000-0000-4000-8000-00000000000b') $$,
  '42501', null, 'Owners cannot add domains');

select is_empty($$ select 1 from public.hero_slides where id = '00000000-0000-4000-8000-000000000b51' $$,
  'Owner A cannot see Ranch B''s inactive slide');
select is((select count(*)::int from public.posts where ranch_id = '00000000-0000-4000-8000-00000000000b'), 1,
  'Owner A sees only Ranch B''s published post');

select lives_ok($$ insert into storage.objects (bucket_id, name)
  values ('ranch-originals', '00000000-0000-4000-8000-00000000000a/m1/original.jpg') $$,
  'Owner A can upload into their own ranch folder');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('ranch-originals', '00000000-0000-4000-8000-00000000000b/m1/original.jpg') $$,
  '42501', null, 'Owner A cannot upload into Ranch B''s folder');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('ranch-originals', 'not-a-uuid/m1/original.jpg') $$,
  '42501', null, 'Uploads outside any ranch folder are rejected');

with d as (delete from public.animals where id = '00000000-0000-4000-8000-000000000a01' returning 1)
select is(count(*)::int, 0, 'An animal that is not archived cannot be permanently deleted') from d;
with d as (delete from public.animals where id = '00000000-0000-4000-8000-000000000a03' returning 1)
select is(count(*)::int, 1, 'An archived animal can be permanently deleted') from d;

-- ─── Signed in, but a member of no ranch ─────────────────────────────────────
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000c1", "role": "authenticated"}';
select throws_ok($$
  insert into public.animals (ranch_id, species, category_id, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Stranger', 'female') $$,
  '42501', null, 'A signed-in user with no membership cannot add animals');
select is_empty($$ select 1 from public.ranch_private $$,
  'A signed-in user with no membership cannot read any private settings');

-- ─── Anonymous visitor ───────────────────────────────────────────────────────
reset role;
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select results_eq(
  $$ select name from public.animals where ranch_id = '00000000-0000-4000-8000-00000000000a' order by name $$,
  $$ values ('A Public Stallion'::text) $$,
  'Visitors see only published, non-archived animals');
select is_empty($$ select 1 from public.ranch_private $$, 'Visitors cannot read any inquiry email');
select throws_ok($$
  insert into public.animals (ranch_id, species, category_id, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Anon', 'female') $$,
  '42501', null, 'Visitors cannot write');
select is((select count(*)::int from public.posts where ranch_id = '00000000-0000-4000-8000-00000000000b'), 1,
  'Visitors see only published posts');
select is_empty($$ select 1 from public.ranch_memberships $$, 'Visitors cannot list memberships');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('ranch-media', '00000000-0000-4000-8000-00000000000a/x/320.webp') $$,
  '42501', null, 'Visitors cannot upload files');

-- ─── Suspended ranches disappear ─────────────────────────────────────────────
reset role;
update public.ranches set status = 'suspended' where id = '00000000-0000-4000-8000-00000000000b';
set local role anon;
select is_empty($$ select 1 from public.animals where ranch_id = '00000000-0000-4000-8000-00000000000b' $$,
  'A suspended ranch''s animals are hidden from visitors');
select is_empty($$ select 1 from public.ranch_domains where ranch_id = '00000000-0000-4000-8000-00000000000b' $$,
  'A suspended ranch''s domains no longer resolve');

reset role;
select * from finish();
rollback;
