-- Hero banners for the site's main pages: About, For Sale, Horses, Cattle and Contact (image, headline
-- and subheadline), and an image only for each category page. The owner chooses the image from the
-- Photo Library. A page with no row, or a field left empty, falls back to the page's own title.
create table public.page_banners (
  ranch_id    uuid not null references public.ranches (id) on delete cascade,
  page_key    text not null check (
    page_key in ('about', 'for-sale', 'horses', 'cattle', 'contact')
    or page_key ~ '^category:(horse|cattle)\.[a-z0-9_]+$'
  ),
  headline    text check (headline is null or length(btrim(headline)) between 1 and 120),
  subheadline text check (subheadline is null or length(btrim(subheadline)) between 1 and 240),
  media_id    uuid,
  updated_at  timestamptz not null default now(),
  primary key (ranch_id, page_key),
  foreign key (ranch_id, media_id) references public.media (ranch_id, id) on delete set null (media_id)
);

create trigger page_banners_updated_at before update on public.page_banners
  for each row execute function private.set_updated_at();

alter table public.page_banners enable row level security;
create policy "Visitors read page banners" on public.page_banners for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()) or ranch_id in (select private.my_ranch_ids()));
create policy "Members manage page banners" on public.page_banners for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));
create policy "Two-step verification when required"
  on public.page_banners as restrictive for all to authenticated
  using (
    (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and ranch_id not in (select private.mfa_required_ranch_ids())))
  with check (
    (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and ranch_id not in (select private.mfa_required_ranch_ids())));

revoke insert, update, delete, truncate on public.page_banners from anon;
