-- =============================================================================
-- Homepage hero slides, "What's Happening on the Ranch" posts, and FAQs.
-- =============================================================================

-- ─── Hero slides (max 3 active per ranch) ────────────────────────────────────
create table public.hero_slides (
  id              uuid primary key default gen_random_uuid(),
  ranch_id        uuid not null references public.ranches (id) on delete cascade,
  media_id        uuid,     -- a slide without a ready photo is never shown publicly
  headline        text not null check (length(btrim(headline)) between 1 and 120),
  subheadline     text check (subheadline is null or length(btrim(subheadline)) between 1 and 240),
  cta_label       text check (cta_label is null or length(btrim(cta_label)) between 1 and 40),
  cta_kind        public.cta_kind not null default 'none',
  cta_page        public.site_page,
  cta_category_id text references public.animal_categories (id),
  -- If the linked animal is later deleted, the button quietly disappears.
  cta_animal_id   uuid,
  cta_url         text check (cta_url is null or (cta_url ~* '^https?://[^\s]+$' and length(cta_url) <= 500)),
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  is_demo         boolean not null default false,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (ranch_id, media_id) references public.media (ranch_id, id)
    on delete set null (media_id),
  foreign key (ranch_id, cta_animal_id) references public.animals (ranch_id, id)
    on delete set null (cta_animal_id),
  check (cta_kind = 'none' or cta_label is not null),
  check (cta_kind <> 'page'     or cta_page is not null),
  check (cta_kind <> 'category' or cta_category_id is not null),
  check (cta_kind <> 'external' or cta_url is not null)
);
create index hero_slides_ranch on public.hero_slides (ranch_id, sort_order) where archived_at is null;

create trigger hero_slides_updated_at before update on public.hero_slides
  for each row execute function private.set_updated_at();

create function private.hero_slides_limit()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.is_active and new.archived_at is null then
    -- Serialise concurrent writers for this ranch.
    perform pg_advisory_xact_lock(hashtextextended('hero_slides:' || new.ranch_id::text, 0));
    if (select count(*) from public.hero_slides s
        where s.ranch_id = new.ranch_id and s.is_active and s.archived_at is null
          and s.id <> new.id) >= 3 then
      raise exception 'The homepage can show up to 3 slides. Turn one off before adding another.'
        using errcode = 'RA011';
    end if;
  end if;
  return new;
end $$;

create trigger hero_slides_limit
  before insert or update of is_active, archived_at on public.hero_slides
  for each row execute function private.hero_slides_limit();

-- ─── What's Happening on the Ranch ───────────────────────────────────────────
create table public.post_categories (
  id         uuid primary key default gen_random_uuid(),
  ranch_id   uuid not null references public.ranches (id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 60),
  slug       text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  unique (ranch_id, id),
  unique (ranch_id, slug)
);

create table public.posts (
  id                uuid primary key default gen_random_uuid(),
  ranch_id          uuid not null references public.ranches (id) on delete cascade,
  title             text not null check (length(btrim(title)) between 1 and 160),
  slug              text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100),
  excerpt           text check (excerpt is null or length(btrim(excerpt)) between 1 and 300),
  body              jsonb check (body is null or not private.rich_text_is_empty(body)),
  featured_media_id uuid,
  category_id       uuid,
  status            public.post_status not null default 'draft',
  published_at      timestamptz,
  is_demo           boolean not null default false,
  archived_at       timestamptz,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (ranch_id, id),
  unique (ranch_id, slug),
  foreign key (ranch_id, featured_media_id) references public.media (ranch_id, id)
    on delete set null (featured_media_id),
  foreign key (ranch_id, category_id) references public.post_categories (ranch_id, id)
    on delete set null (category_id)
);
create index posts_public on public.posts (ranch_id, published_at desc)
  where status = 'published' and archived_at is null;

create function private.posts_before_write()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := left(private.slugify(new.title), 90);
    if exists (select 1 from public.posts p
               where p.ranch_id = new.ranch_id and p.slug = new.slug and p.id <> new.id) then
      new.slug := new.slug || '-' || left(replace(new.id::text, '-', ''), 6);
    end if;
  else
    new.slug := private.slugify(new.slug);
  end if;
  -- Publishing stamps the date once; the owner may change it afterwards.
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger posts_before_write before insert or update on public.posts
  for each row execute function private.posts_before_write();
create trigger posts_updated_at before update on public.posts
  for each row execute function private.set_updated_at();

create table public.post_media (
  ranch_id   uuid not null,
  post_id    uuid not null,
  media_id   uuid not null,
  sort_order integer not null default 0,
  primary key (post_id, media_id),
  foreign key (ranch_id, post_id)  references public.posts (ranch_id, id) on delete cascade,
  foreign key (ranch_id, media_id) references public.media (ranch_id, id) on delete cascade
);

-- Optional: animals mentioned in a post ("In the news" on the portfolio).
create table public.post_animals (
  ranch_id  uuid not null,
  post_id   uuid not null,
  animal_id uuid not null,
  primary key (post_id, animal_id),
  foreign key (ranch_id, post_id)   references public.posts   (ranch_id, id) on delete cascade,
  foreign key (ranch_id, animal_id) references public.animals (ranch_id, id) on delete cascade
);
create index post_animals_animal on public.post_animals (animal_id);

-- ─── FAQs ────────────────────────────────────────────────────────────────────
create table public.faqs (
  id           uuid primary key default gen_random_uuid(),
  ranch_id     uuid not null references public.ranches (id) on delete cascade,
  question     text not null check (length(btrim(question)) between 1 and 300),
  answer       jsonb not null check (not private.rich_text_is_empty(answer)),
  group_label  text check (group_label is null or length(btrim(group_label)) between 1 and 60),
  sort_order   integer not null default 0,
  is_published boolean not null default true,
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index faqs_ranch on public.faqs (ranch_id, sort_order);

create trigger faqs_updated_at before update on public.faqs
  for each row execute function private.set_updated_at();
