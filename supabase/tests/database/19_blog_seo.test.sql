-- Post meta text, the blog's name, and page_seo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.ranches (id, slug, name, status) values ('00000000-0000-4000-8000-00000000000a', 'blogseo', 'Blog SEO Ranch', 'live');
insert into public.posts (ranch_id, title, status, meta_title, meta_description, focus_phrase)
  values ('00000000-0000-4000-8000-00000000000a', 'Branding day', 'published', 'Branding day at the ranch', 'How we do it.', 'ranch branding');
insert into public.page_seo (ranch_id, page_key, meta_title, meta_description) values ('00000000-0000-4000-8000-00000000000a', 'about', 'About us', 'Who we are.');

set local role anon;
select is((select meta_title from public.posts where title = 'Branding day'), 'Branding day at the ranch', 'visitors read a published post''s meta title');
select is((select meta_description from public.page_seo where page_key = 'about'), 'Who we are.', 'and a page''s meta description');
select throws_ok($$ update public.page_seo set meta_title = 'x' $$, '42501', null, 'visitors cannot change page seo');
reset role;

select throws_ok($$ insert into public.posts (ranch_id, title, meta_description) values ('00000000-0000-4000-8000-00000000000a', 'X', repeat('x', 201)) $$,
  '23514', null, 'a meta description over 200 characters is refused');
select throws_ok($$ insert into public.page_seo (ranch_id, page_key) values ('00000000-0000-4000-8000-00000000000a', 'Bad Key!') $$,
  '23514', null, 'a page key must be a plain key');
select lives_ok($$ update public.ranch_profile set blog_label = 'Experiences' where ranch_id = '00000000-0000-4000-8000-00000000000a' $$, 'a ranch can name its blog');
select lives_ok($$ insert into public.page_banners (ranch_id, page_key) values ('00000000-0000-4000-8000-00000000000a', 'on-the-ranch') $$, 'the blog can have a banner');

select * from finish();
rollback;
