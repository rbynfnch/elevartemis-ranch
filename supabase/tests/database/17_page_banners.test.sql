-- Page banners: visitors read them, only the page keys we allow are accepted.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.ranches (id, slug, name, status) values ('00000000-0000-4000-8000-00000000000a', 'banners', 'Banner Ranch', 'live');
insert into public.page_banners (ranch_id, page_key, headline, subheadline) values
  ('00000000-0000-4000-8000-00000000000a', 'about', 'Our Ranch', 'Raised here'),
  ('00000000-0000-4000-8000-00000000000a', 'category:cattle.bull', null, null);

set local role anon;
select is((select headline from public.page_banners where page_key = 'about'), 'Our Ranch', 'visitors read a live ranch''s banner');
select is((select count(*)::int from public.page_banners), 2, 'including a category banner');
select throws_ok($$ update public.page_banners set headline = 'x' $$, '42501', null, 'visitors cannot change one');
reset role;

select throws_ok($$ insert into public.page_banners (ranch_id, page_key) values ('00000000-0000-4000-8000-00000000000a', 'checkout') $$,
  '23514', null, 'an unknown page key is refused');
select throws_ok($$ insert into public.page_banners (ranch_id, page_key, headline) values ('00000000-0000-4000-8000-00000000000a', 'contact', '   ') $$,
  '23514', null, 'a blank headline is refused');

select lives_ok($$ insert into public.page_banners (ranch_id, page_key) values ('00000000-0000-4000-8000-00000000000a', 'sold-horses') $$, 'Sold Horses can have a banner');

select lives_ok($$ insert into public.page_banners (ranch_id, page_key) values ('00000000-0000-4000-8000-00000000000a', 'in-memory') $$, 'In Memory can have a banner');
select lives_ok($$ insert into public.page_banners (ranch_id, page_key) values ('00000000-0000-4000-8000-00000000000a', 'retired-cattle') $$, 'so can the retired pages');

select lives_ok($$ insert into public.page_banners (ranch_id, page_key) values ('00000000-0000-4000-8000-00000000000a', 'faq') $$, 'the FAQ can have a banner');

select * from finish();
rollback;
