-- Video links: https addresses on the supported sites only.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.ranches (id, slug, name) values ('00000000-0000-4000-8000-00000000000a', 'videolinks', 'Video Ranch');
insert into public.animals (id, ranch_id, species, category_id, name, sex) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'horse', 'horse.mare', 'Mare', 'female');

select lives_ok($$ insert into public.animal_videos (ranch_id, animal_id, url) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001', 'https://www.youtube.com/watch?v=abc123') $$,
  'A YouTube link is accepted');
select lives_ok($$ insert into public.animal_videos (ranch_id, animal_id, url) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001', 'https://www.tiktok.com/@flyingw/video/123') $$,
  'A TikTok link is accepted');
select lives_ok($$ insert into public.animal_videos (ranch_id, animal_id, url) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001', 'https://www.instagram.com/reel/Cxyz/') $$,
  'An Instagram link is accepted');
select throws_ok($$ insert into public.animal_videos (ranch_id, animal_id, url) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001', 'https://evil.example/youtube.com/x') $$,
  '23514', null, 'Any other site is refused');
select throws_ok($$ insert into public.animal_videos (ranch_id, animal_id, url) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001', 'http://www.youtube.com/watch?v=abc') $$,
  '23514', null, 'A link that is not https is refused');

select * from finish();
rollback;
