-- The blog editor: authors, tags, related posts, trash, revisions, private working copies of live posts, share text,
-- permanent redirects when a web address changes, and a record of which photos each post uses.
--
-- Scheduling already works in the database: a post that is published with a date in the future is hidden by the
-- public read policy until that moment. Nothing here depends on a browser timer.

-- ─── Posts ───────────────────────────────────────────────────────────────────
alter table public.posts
  add column deleted_at       timestamptz,                -- in the trash; can be restored
  add column author_name      text check (author_name is null or length(btrim(author_name)) between 1 and 80),
  add column show_author      boolean not null default false,
  add column og_title         text check (og_title is null or length(btrim(og_title)) between 1 and 100),
  add column og_description   text check (og_description is null or length(btrim(og_description)) between 1 and 300),
  add column og_media_id      uuid,
  add column content_version  smallint not null default 1,
  -- Edits to a post that is already live wait here until the owner presses Update.
  add column draft_data       jsonb,
  add column draft_saved_at   timestamptz,
  add column last_edited_by   uuid references auth.users (id) on delete set null,
  add constraint posts_og_media_fk foreign key (ranch_id, og_media_id) references public.media (ranch_id, id)
    on delete set null (og_media_id);

-- The block document replaces "rich text with some text in it": a post may be only photos, a video or a button.
alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts add constraint posts_body_is_a_document check (body is null or jsonb_typeof(body) = 'object');

-- Addresses the public site uses for other things.
alter table public.posts add constraint posts_slug_not_reserved check (slug not in ('preview', 'category', 'page'));

create index posts_ranch_status on public.posts (ranch_id, status, updated_at desc) where deleted_at is null;

-- Visitors never see a post in the trash, an archived post, a draft or one that is not yet due.
drop policy if exists "Visitors read published posts" on public.posts;
create policy "Visitors read published posts" on public.posts for select to anon, authenticated
  using ((status = 'published' and published_at <= now() and archived_at is null and deleted_at is null
          and ranch_id in (select private.visible_ranch_ids()))
         or ranch_id in (select private.my_ranch_ids()));

-- ─── Tags ────────────────────────────────────────────────────────────────────
create table public.post_tags (
  id       uuid primary key default gen_random_uuid(),
  ranch_id uuid not null references public.ranches (id) on delete cascade,
  name     text not null check (length(btrim(name)) between 1 and 40),
  slug     text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  unique (ranch_id, id),
  unique (ranch_id, slug)
);

create table public.post_tag_links (
  ranch_id uuid not null,
  post_id  uuid not null,
  tag_id   uuid not null,
  primary key (post_id, tag_id),
  foreign key (ranch_id, post_id) references public.posts (ranch_id, id) on delete cascade,
  foreign key (ranch_id, tag_id)  references public.post_tags (ranch_id, id) on delete cascade
);

-- ─── Related posts the owner chose ───────────────────────────────────────────
create table public.post_related (
  ranch_id        uuid not null,
  post_id         uuid not null,
  related_post_id uuid not null,
  sort_order      integer not null default 0,
  primary key (post_id, related_post_id),
  check (post_id <> related_post_id),
  foreign key (ranch_id, post_id)         references public.posts (ranch_id, id) on delete cascade,
  foreign key (ranch_id, related_post_id) references public.posts (ranch_id, id) on delete cascade
);

-- ─── Old web addresses keep working ──────────────────────────────────────────
create table public.post_slug_history (
  ranch_id   uuid not null references public.ranches (id) on delete cascade,
  old_slug   text not null,
  post_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (ranch_id, old_slug),
  foreign key (ranch_id, post_id) references public.posts (ranch_id, id) on delete cascade
);

create function private.posts_remember_slug()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  -- A post that was ever shown publicly keeps its old address as a permanent redirect.
  if new.slug is distinct from old.slug and (old.published_at is not null and old.status = 'published') then
    insert into public.post_slug_history (ranch_id, old_slug, post_id) values (old.ranch_id, old.slug, old.id)
    on conflict (ranch_id, old_slug) do update set post_id = excluded.post_id, created_at = now();
  end if;
  -- An address a post takes over is no longer a redirect to someone else.
  if new.slug is distinct from old.slug then
    delete from public.post_slug_history h where h.ranch_id = new.ranch_id and h.old_slug = new.slug;
  end if;
  return new;
end $$;

create trigger posts_remember_slug after update of slug on public.posts
  for each row execute function private.posts_remember_slug();

-- ─── Revisions ───────────────────────────────────────────────────────────────
create table public.post_revisions (
  id         uuid primary key default gen_random_uuid(),
  ranch_id   uuid not null,
  post_id    uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  reason     text not null check (reason in ('save', 'autosave', 'publish', 'update', 'restore', 'duplicate')),
  snapshot   jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  foreign key (ranch_id, post_id) references public.posts (ranch_id, id) on delete cascade
);
create index post_revisions_post on public.post_revisions (post_id, created_at desc);

-- ─── Which photos a post uses ────────────────────────────────────────────────
-- Kept in step with the post's content on every save. A photo that a post still uses cannot be deleted.
create table public.post_media_refs (
  ranch_id uuid not null,
  post_id  uuid not null,
  media_id uuid not null,
  primary key (post_id, media_id),
  foreign key (ranch_id, post_id)  references public.posts (ranch_id, id) on delete cascade,
  foreign key (ranch_id, media_id) references public.media (ranch_id, id) on delete restrict
);
create index post_media_refs_media on public.post_media_refs (media_id);

-- ─── Access ──────────────────────────────────────────────────────────────────
alter table public.post_tags         enable row level security;
alter table public.post_tag_links    enable row level security;
alter table public.post_related      enable row level security;
alter table public.post_slug_history enable row level security;
alter table public.post_revisions    enable row level security;
alter table public.post_media_refs   enable row level security;
revoke insert, update, delete, truncate on public.post_tags, public.post_tag_links, public.post_related,
  public.post_slug_history, public.post_revisions, public.post_media_refs from anon;
revoke all on public.post_revisions, public.post_media_refs from anon;

create policy "Visitors read tags" on public.post_tags for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()) or ranch_id in (select private.my_ranch_ids()));
create policy "Members manage tags" on public.post_tags for all to authenticated
  using (ranch_id in (select private.my_ranch_ids())) with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read tag links" on public.post_tag_links for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "Members manage tag links" on public.post_tag_links for all to authenticated
  using (ranch_id in (select private.my_ranch_ids())) with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read related posts" on public.post_related for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id)
         and exists (select 1 from public.posts r where r.id = related_post_id));
create policy "Members manage related posts" on public.post_related for all to authenticated
  using (ranch_id in (select private.my_ranch_ids())) with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read old addresses" on public.post_slug_history for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "Members manage old addresses" on public.post_slug_history for all to authenticated
  using (ranch_id in (select private.my_ranch_ids())) with check (ranch_id in (select private.my_ranch_ids()));

create policy "Members manage revisions" on public.post_revisions for all to authenticated
  using (ranch_id in (select private.my_ranch_ids())) with check (ranch_id in (select private.my_ranch_ids()));
create policy "Members manage photo references" on public.post_media_refs for all to authenticated
  using (ranch_id in (select private.my_ranch_ids())) with check (ranch_id in (select private.my_ranch_ids()));

do $$
declare t text;
begin
  foreach t in array array['post_tags', 'post_tag_links', 'post_related', 'post_slug_history', 'post_revisions', 'post_media_refs'] loop
    execute format($f$
      create policy "Two-step verification when required"
        on public.%I as restrictive for all to authenticated
        using (
          (select private.session_is_aal2())
          or ((select not private.has_verified_factor())
              and ranch_id not in (select private.mfa_required_ranch_ids())))
        with check (
          (select private.session_is_aal2())
          or ((select not private.has_verified_factor())
              and ranch_id not in (select private.mfa_required_ranch_ids())))
    $f$, t);
  end loop;
end $$;

-- ─── A starting set of categories for ranches that have none ─────────────────
insert into public.post_categories (ranch_id, name, slug, sort_order)
select r.id, c.name, c.slug, c.ord
from public.ranches r
cross join (values
  ('Ranch Life', 'ranch-life', 10),
  ('Our Horses', 'our-horses', 20),
  ('Our Cattle', 'our-cattle', 30),
  ('For Sale & New Arrivals', 'for-sale-new-arrivals', 40),
  ('Ranch News', 'ranch-news', 50),
  ('Seasonal Updates', 'seasonal-updates', 60)
) as c(name, slug, ord)
where not exists (select 1 from public.post_categories pc where pc.ranch_id = r.id)
on conflict do nothing;

