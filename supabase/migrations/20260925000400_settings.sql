-- =============================================================================
-- Ranch settings, split into tables by WHO may edit them (RLS is per table/row):
--   ranch_profile   owner edits · public reads
--   ranch_private   owner edits · never public (inquiry email)
--   social_links    owner edits · public reads
--   pages           owner edits text/photos in fixed sections · public reads
--   ranch_branding  Elevartemis only · public reads
--   ranch_seo       Elevartemis only · public reads
-- One row of each 1:1 table is created automatically with every ranch.
-- =============================================================================

create table public.ranch_profile (
  ranch_id        uuid primary key references public.ranches (id) on delete cascade,
  tagline         text check (tagline is null or length(btrim(tagline)) between 1 and 200),
  intro           jsonb check (intro is null or not private.rich_text_is_empty(intro)),
  public_phone    text check (public_phone is null or length(btrim(public_phone)) between 7 and 40),
  city            text,
  region          text,        -- state / province
  address_display text,        -- optional; many ranches prefer city + state only
  hours_text      text,
  updated_at      timestamptz not null default now()
);

create table public.ranch_private (
  ranch_id      uuid primary key references public.ranches (id) on delete cascade,
  inquiry_email text check (inquiry_email is null
                            or inquiry_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  inquiry_cc    text[] not null default '{}' check (cardinality(inquiry_cc) <= 3),
  updated_at    timestamptz not null default now()
);
comment on table public.ranch_private is
  'Never readable by visitors. The contact handler reads it server-side only.';

create table public.ranch_branding (
  ranch_id          uuid primary key references public.ranches (id) on delete cascade,
  wordmark_text     text,          -- defaults to ranches.name when null
  wordmark_subtitle text,          -- e.g. "Ranch", "Quarter Horses & Angus"
  brand_mark        text check (brand_mark is null or length(brand_mark) <= 4),  -- e.g. "CC"
  logo_media_id     uuid,
  -- Partial overrides of design tokens, e.g. {"primary": "#2E4A3B"}.
  palette           jsonb not null default '{}' check (jsonb_typeof(palette) = 'object'),
  font_preset       text not null default 'heritage',
  updated_at        timestamptz not null default now(),
  foreign key (ranch_id, logo_media_id) references public.media (ranch_id, id)
    on delete set null (logo_media_id)
);

create table public.ranch_seo (
  ranch_id            uuid primary key references public.ranches (id) on delete cascade,
  title_template      text not null default '%s | {ranch}',
  default_description text check (default_description is null or length(default_description) <= 300),
  og_media_id         uuid,
  ga4_id              text check (ga4_id is null or ga4_id ~ '^G-[A-Z0-9]{4,}$'),
  gsc_verification    text check (gsc_verification is null or gsc_verification ~ '^[A-Za-z0-9_-]{10,100}$'),
  -- New ranches stay out of search results until Elevartemis launches them.
  noindex             boolean not null default true,
  updated_at          timestamptz not null default now(),
  foreign key (ranch_id, og_media_id) references public.media (ranch_id, id)
    on delete set null (og_media_id)
);

create table public.social_links (
  id         uuid primary key default gen_random_uuid(),
  ranch_id   uuid not null references public.ranches (id) on delete cascade,
  platform   public.social_platform not null,
  url        text not null check (url ~* '^https://[^\s]+$' and length(url) <= 500),
  label      text,                 -- only used for platform = 'other'
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (platform <> 'other' or label is not null)
);
create unique index social_links_one_per_platform
  on public.social_links (ranch_id, platform) where platform <> 'other';

-- Structured, designed pages. v1 has only "about".
-- sections: [{ "id", "kind": "text"|"image_text"|"quote"|"photo_band",
--              "heading"?, "body"?, "media_id"?, "placeholder"? }]
-- Layout and allowed kinds are owned by Elevartemis (validated in the app).
create table public.pages (
  ranch_id   uuid not null references public.ranches (id) on delete cascade,
  key        text not null check (key in ('about')),
  title      text not null,
  sections   jsonb not null default '[]' check (jsonb_typeof(sections) = 'array'),
  updated_at timestamptz not null default now(),
  primary key (ranch_id, key)
);

create trigger ranch_profile_updated_at  before update on public.ranch_profile
  for each row execute function private.set_updated_at();
create trigger ranch_private_updated_at  before update on public.ranch_private
  for each row execute function private.set_updated_at();
create trigger ranch_branding_updated_at before update on public.ranch_branding
  for each row execute function private.set_updated_at();
create trigger ranch_seo_updated_at      before update on public.ranch_seo
  for each row execute function private.set_updated_at();
create trigger pages_updated_at          before update on public.pages
  for each row execute function private.set_updated_at();

-- Every new ranch gets its settings rows, so provisioning is a single insert.
create function private.handle_new_ranch()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.ranch_profile  (ranch_id) values (new.id);
  insert into public.ranch_private  (ranch_id) values (new.id);
  insert into public.ranch_branding (ranch_id) values (new.id);
  insert into public.ranch_seo      (ranch_id) values (new.id);
  insert into public.pages (ranch_id, key, title) values (new.id, 'about', 'About');
  return new;
end $$;

create trigger ranches_create_settings after insert on public.ranches
  for each row execute function private.handle_new_ranch();
