-- Happening on the Ranch: back-dated history posts and scheduled posts.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.ranches (id, slug, name) values ('00000000-0000-4000-8000-00000000000a', 'history', 'History Ranch');

select throws_ok($$ update public.ranch_profile set time_zone = 'Mars/Olympus' where ranch_id = '00000000-0000-4000-8000-00000000000a' $$,
  'RA014', null, 'Unknown time zones are rejected');
select is((select time_zone from public.ranch_profile where ranch_id = '00000000-0000-4000-8000-00000000000a'), 'America/Denver',
  'Ranches default to Mountain time');

insert into public.posts (id, ranch_id, title, status, published_at, date_precision) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000a', 'Moving cattle', 'published',
   '2019-05-01 00:30:00-06', 'month'),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000000a', 'Branding day', 'published',
   '2012-07-15 09:00:00-06', 'year'),
  ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-00000000000a', 'Next spring', 'published',
   now() + interval '30 days', 'day'),
  ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-00000000000a', 'Today', 'published', null, 'month');

select is((select (published_at at time zone 'America/Denver')::text from public.posts where id = '00000000-0000-4000-8000-0000000000e1'),
  '2019-05-01 12:00:00', 'A month-only date is stored as noon on the 1st in ranch time (never slips into April)');
select is((select (published_at at time zone 'America/Denver')::text from public.posts where id = '00000000-0000-4000-8000-0000000000e2'),
  '2012-01-01 12:00:00', 'A year-only date is stored as noon on January 1');
select is((select date_precision::text from public.posts where id = '00000000-0000-4000-8000-0000000000e4'), 'day',
  'Publishing without a date uses today, to the day');
select throws_ok($$ insert into public.posts (ranch_id, title, status, published_at)
  values ('00000000-0000-4000-8000-00000000000a', 'Too old', 'published', '1700-01-01') $$,
  '23514', null, 'Implausible dates are rejected');

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select results_eq(
  $$ select title from public.posts where ranch_id = '00000000-0000-4000-8000-00000000000a' order by published_at desc $$,
  $$ values ('Today'::text), ('Moving cattle'), ('Branding day') $$,
  'Visitors see history posts in date order; a scheduled post stays hidden until its date');

reset role;
select * from finish();
rollback;
