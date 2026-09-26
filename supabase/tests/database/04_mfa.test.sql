-- Two-step verification is enforced by the database, not only the app.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'with-mfa@test.local'),
  ('00000000-0000-4000-8000-0000000000a2', 'no-mfa@test.local'),
  ('00000000-0000-4000-8000-0000000000b1', 'strict-owner@test.local');

insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'Authenticator app', 'totp', 'verified', now(), now()),
  -- An abandoned, unverified enrolment must not lock anyone out.
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000a2', 'Authenticator app', 'totp', 'unverified', now(), now());

insert into public.ranches (id, slug, name, features) values
  ('00000000-0000-4000-8000-00000000000a', 'mfa-optional', 'Optional Ranch', '{}'),
  ('00000000-0000-4000-8000-00000000000b', 'mfa-required', 'Strict Ranch', '{"require_mfa": true}');
insert into public.ranch_memberships (ranch_id, user_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a2'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000b1');
insert into public.animals (ranch_id, species, category_id, name, sex, is_published) values
  ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Optional Draft', 'female', false),
  ('00000000-0000-4000-8000-00000000000b', 'horse', 'horse.mare', 'Strict Draft', 'female', false);

set local role authenticated;

-- User WITH a verified authenticator, password only (aal1)
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select 1 from public.animals where name = 'Optional Draft' $$,
  'Password alone is not enough once two-step verification is on (read)');
select is_empty($$ select 1 from public.ranch_private $$,
  'Password alone cannot read the private inquiry email');
select throws_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Sneaky', 'female') $$,
  '42501', null, 'Password alone cannot add animals');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('ranch-originals', '00000000-0000-4000-8000-00000000000a/x/original.jpg') $$,
  '42501', null, 'Password alone cannot upload files');
select is((select count(*)::int from public.my_mfa_requirements()), 1,
  'Membership info stays readable so the app can ask for the code');

-- Same user after entering the code (aal2)
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a1", "role": "authenticated", "aal": "aal2"}';
select isnt_empty($$ select 1 from public.animals where name = 'Optional Draft' $$,
  'After the code, the owner has full access');
select lives_ok($$ insert into public.animals (ranch_id, species, category_id, name, sex)
  values ('00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Verified Add', 'female') $$,
  'After the code, the owner can add animals');

-- User without two-step verification on an optional ranch
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000a2", "role": "authenticated", "aal": "aal1"}';
select isnt_empty($$ select 1 from public.animals where name = 'Optional Draft' $$,
  'Without two-step verification turned on, a password session works (optional ranch)');

-- Owner of a ranch that REQUIRES two-step verification, not yet set up
set local request.jwt.claims to '{"sub": "00000000-0000-4000-8000-0000000000b1", "role": "authenticated", "aal": "aal1"}';
select is_empty($$ select 1 from public.animals where name = 'Strict Draft' $$,
  'A ranch that requires two-step verification blocks password-only sessions');
with u as (update public.ranch_profile set tagline = 'x'
           where ranch_id = '00000000-0000-4000-8000-00000000000b' returning 1)
select is(count(*)::int, 0, 'Required two-step verification also blocks edits') from u;
select results_eq($$ select required from public.my_mfa_requirements() $$, $$ values (true) $$,
  'The app can see that this ranch requires two-step verification');

-- Visitors are unaffected
reset role;
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select isnt_empty($$ select 1 from public.ranch_profile where ranch_id = '00000000-0000-4000-8000-00000000000b' $$,
  'Public pages of an MFA-required ranch still load for visitors');

reset role;
select * from finish();
rollback;
