-- Search-engine text for posts and for every other page, and the owner's name for the blog.

-- Each post can carry its own meta title, meta description and focus phrase (a writing guide, not a tag).
alter table public.posts
  add column meta_title       text check (meta_title is null or length(btrim(meta_title)) between 1 and 70),
  add column meta_description text check (meta_description is null or length(btrim(meta_description)) between 1 and 200),
  add column focus_phrase     text check (focus_phrase is null or length(btrim(focus_phrase)) between 1 and 80);

-- What the ranch calls its blog: "Happening on the Ranch", "Experiences", "Ranch Life"...
alter table public.ranch_profile
  add column blog_label text check (blog_label is null or length(btrim(blog_label)) between 1 and 60);

-- Meta title, description, focus phrase and share image for the other pages (page_key like page_banners).
create table public.page_seo (
  ranch_id         uuid not null references public.ranches (id) on delete cascade,
  page_key         text not null check (page_key ~ '^[a-z0-9][a-z0-9:._-]{0,79}$'),
  meta_title       text check (meta_title is null or length(btrim(meta_title)) between 1 and 70),
  meta_description text check (meta_description is null or length(btrim(meta_description)) between 1 and 200),
  focus_phrase     text check (focus_phrase is null or length(btrim(focus_phrase)) between 1 and 80),
  og_media_id      uuid,
  updated_at       timestamptz not null default now(),
  primary key (ranch_id, page_key),
  foreign key (ranch_id, og_media_id) references public.media (ranch_id, id) on delete set null (og_media_id)
);

create trigger page_seo_updated_at before update on public.page_seo
  for each row execute function private.set_updated_at();

alter table public.page_seo enable row level security;
create policy "Visitors read page seo" on public.page_seo for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()) or ranch_id in (select private.my_ranch_ids()));
create policy "Members manage page seo" on public.page_seo for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));
create policy "Two-step verification when required"
  on public.page_seo as restrictive for all to authenticated
  using (
    (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and ranch_id not in (select private.mfa_required_ranch_ids())))
  with check (
    (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and ranch_id not in (select private.mfa_required_ranch_ids())));
revoke insert, update, delete, truncate on public.page_seo from anon;

-- Banners for the blog and the breeding page.
alter table public.page_banners drop constraint if exists page_banners_page_key_check;
alter table public.page_banners add constraint page_banners_page_key_check check (
  page_key in ('about', 'for-sale', 'horses', 'cattle', 'contact', 'in-memory', 'on-the-ranch', 'breeding')
  or page_key ~ '^(sold|retired|reference)-(horses|cattle)$'
  or page_key ~ '^category:(horse|cattle)\.[a-z0-9_]+$'
);
