-- Contact messages: private to the ranch, and the contact page content row exists.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.ranches (id, slug, name) values ('00000000-0000-4000-8000-00000000000a', 'inquiries', 'Inquiry Ranch');
select is((select count(*)::int from public.pages where ranch_id = '00000000-0000-4000-8000-00000000000a' and key = 'contact'), 1,
  'a new ranch gets a contact page row');

insert into public.inquiries (ranch_id, name, email, message)
  values ('00000000-0000-4000-8000-00000000000a', 'Pat', 'pat@example.com', 'Is the mare still available?');
select is((select status from public.inquiries limit 1), 'new', 'a new message starts as new');

select throws_ok($$ insert into public.inquiries (ranch_id, name, email, message) values ('00000000-0000-4000-8000-00000000000a', 'X', 'not-an-email', 'hi') $$,
  '23514', null, 'a bad email address is refused');
select throws_ok($$ insert into public.inquiries (ranch_id, name, email, message) values ('00000000-0000-4000-8000-00000000000a', 'X', 'x@example.com', '   ') $$,
  '23514', null, 'an empty message is refused');
select throws_ok($$ update public.inquiries set status = 'deleted' $$, '23514', null, 'status is one of new, read, archived');

set local role anon;
select throws_ok($$ select * from public.inquiries $$, '42501', null, 'visitors cannot read messages');
select throws_ok($$ insert into public.inquiries (ranch_id, name, email, message) values ('00000000-0000-4000-8000-00000000000a', 'X', 'x@example.com', 'hi') $$,
  '42501', null, 'and cannot write them directly');

select * from finish();
rollback;
