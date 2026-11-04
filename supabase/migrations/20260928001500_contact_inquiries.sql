-- The Contact page: its owner-edited content (pages key 'contact') and the messages visitors send.

-- ─── Page content ────────────────────────────────────────────────────────────
alter table public.pages drop constraint if exists pages_key_check;
alter table public.pages add constraint pages_key_check check (key in ('about', 'contact'));

insert into public.pages (ranch_id, key, title)
select id, 'contact', 'Contact' from public.ranches
on conflict (ranch_id, key) do nothing;

create or replace function private.handle_new_ranch()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.ranch_profile  (ranch_id) values (new.id);
  insert into public.ranch_private  (ranch_id) values (new.id);
  insert into public.ranch_branding (ranch_id) values (new.id);
  insert into public.ranch_seo      (ranch_id) values (new.id);
  insert into public.pages (ranch_id, key, title) values (new.id, 'about', 'About');
  insert into public.pages (ranch_id, key, title) values (new.id, 'contact', 'Contact');
  return new;
end $$;

-- ─── Messages from visitors ──────────────────────────────────────────────────
-- Written only by the server (service role) after it has checked the form; read and managed by the
-- ranch's members. Visitors can neither read nor write this table.
create table public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  ranch_id   uuid not null references public.ranches (id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 120),
  email      text not null check (length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- What they said they're interested in, and, from an animal's Inquire button, which animal.
  topic      text check (topic is null or length(btrim(topic)) between 1 and 120),
  animal_id  uuid,
  animal_name text check (animal_name is null or length(btrim(animal_name)) between 1 and 120),
  message    text not null check (length(btrim(message)) between 1 and 4000),
  status     text not null default 'new' check (status in ('new', 'read', 'archived')),
  -- Set when the notification email went out (it is optional; the message is always kept here).
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (ranch_id, animal_id) references public.animals (ranch_id, id) on delete set null (animal_id)
);
create index inquiries_ranch on public.inquiries (ranch_id, created_at desc);

alter table public.inquiries enable row level security;
revoke all on public.inquiries from anon;
revoke insert, truncate on public.inquiries from authenticated;

create policy "Members read inquiries" on public.inquiries for select to authenticated
  using (ranch_id in (select private.my_ranch_ids()));
create policy "Members update inquiries" on public.inquiries for update to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));
create policy "Members delete inquiries" on public.inquiries for delete to authenticated
  using (ranch_id in (select private.my_ranch_ids()));

create policy "Two-step verification when required"
  on public.inquiries as restrictive for all to authenticated
  using (
    (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and ranch_id not in (select private.mfa_required_ranch_ids())))
  with check (
    (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and ranch_id not in (select private.mfa_required_ranch_ids())));
