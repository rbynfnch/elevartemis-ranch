-- The blog editor's rules: what visitors may see, redirects, revisions, and photo protection.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into public.ranches (id, slug, name, status) values ('00000000-0000-4000-8000-00000000000a', 'blogedit', 'Blog Edit Ranch', 'live');
insert into public.media (id, ranch_id, status) values ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000000a', 'ready');

insert into public.posts (id, ranch_id, title, slug, status, published_at, body) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-00000000000a', 'Live', 'live', 'published', now() - interval '1 day', '{"type":"doc","content":[{"type":"video","attrs":{"provider":"youtube","videoId":"abc12345678"}}]}'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-00000000000a', 'Scheduled', 'scheduled-one', 'published', now() + interval '2 days', null),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-00000000000a', 'Draft', 'draft-one', 'draft', null, null),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-00000000000a', 'Trashed', 'trashed-one', 'published', now() - interval '1 day', null);
update public.posts set deleted_at = now() where slug = 'trashed-one';

select is((select body #>> '{content,0,type}' from public.posts where slug = 'live'), 'video', 'a post may be only a video (no text needed)');

set local role anon;
select is((select count(*)::int from public.posts), 1, 'visitors see only the live post');
select is((select count(*)::int from public.posts where slug = 'scheduled-one'), 0, 'a scheduled post stays hidden until its time');
select is((select count(*)::int from public.posts where slug = 'trashed-one'), 0, 'and a post in the trash is hidden');
select throws_ok($$ select * from public.post_revisions $$, '42501', null, 'visitors cannot read revisions');
reset role;

-- The time passes: the same post is now visible, with no change to it
update public.posts set published_at = now() - interval '1 minute' where slug = 'scheduled-one';
set local role anon;
select is((select count(*)::int from public.posts where slug = 'scheduled-one'), 1, 'a scheduled post appears once its time has passed');
reset role;

-- A published post keeps its old address as a redirect
update public.posts set slug = 'live-renamed' where slug = 'live';
select is((select post_id from public.post_slug_history where old_slug = 'live'), '00000000-0000-4000-8000-000000000101'::uuid, 'the old address of a live post is remembered');
update public.posts set slug = 'draft-renamed' where slug = 'draft-one';
select is((select count(*)::int from public.post_slug_history where old_slug = 'draft-one'), 0, 'a draft that was never shown leaves no redirect');
update public.posts set slug = 'live' where slug = 'live-renamed';
select is((select count(*)::int from public.post_slug_history where old_slug = 'live'), 0, 'taking an old address back removes its redirect');

select throws_ok($$ update public.posts set slug = 'preview' where slug = 'live' $$, '23514', null, 'the preview address is reserved');

-- A photo a post uses cannot be deleted
insert into public.post_media_refs (ranch_id, post_id, media_id) values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-0000000000e1');
select throws_ok($$ delete from public.media where id = '00000000-0000-4000-8000-0000000000e1' $$, '23503', null, 'a photo still used by a post cannot be deleted');

insert into public.post_revisions (ranch_id, post_id, reason, snapshot) values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000101', 'save', '{"title":"Live"}');
select is((select count(*)::int from public.post_revisions), 1, 'revisions are stored');
select throws_ok($$ insert into public.post_revisions (ranch_id, post_id, reason, snapshot) values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000101', 'nope', '{}') $$, '23514', null, 'a revision needs a known reason');
insert into public.post_tags (ranch_id, name, slug) values ('00000000-0000-4000-8000-00000000000a', 'Calving', 'calving');
select throws_ok($$ insert into public.post_tags (ranch_id, name, slug) values ('00000000-0000-4000-8000-00000000000a', 'Calving 2', 'calving') $$, '23505', null, 'tag addresses are unique per ranch');

select * from finish();
rollback;
