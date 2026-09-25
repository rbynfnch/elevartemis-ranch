-- =============================================================================
-- Animals
--
-- One table holds BOTH the ranch's own animals (record_scope = 'inventory') and
-- outside ancestors that exist only for pedigrees (record_scope = 'pedigree_only').
-- Promoting an outside ancestor to a ranch animal is a single UPDATE: same row,
-- same id, so every pedigree and offspring link stays intact.
--
-- Classification is split into independent dimensions so an animal is never
-- duplicated and contradictory states are impossible:
--   category        one role (stallion, mare, foal … / bull, cow, calf …)
--   program_status  active · retired · reference (previous stallion) · deceased
--   sale_listings   available · pending · sold   (no row = not for sale)
--   flags           is_featured · breeding_available · is_published
--   archived_at     "Recently Deleted"
--
-- Parentage is stored ONCE, on the child (sire_id / dam_id). Offspring are
-- always derived by query — never stored.
-- =============================================================================

-- ─── Categories (platform reference data, not per ranch) ─────────────────────
create table public.animal_categories (
  id                   text primary key,            -- e.g. 'horse.stallion'
  species              public.species not null,
  key                  text not null,
  label_singular       text not null,
  label_plural         text not null,
  path_segment         text not null,               -- /horses/{path_segment}
  groups_by_birth_year boolean not null default false,
  allowed_sexes        public.animal_sex[] not null,
  sort_order           integer not null,
  unique (species, key),
  unique (species, path_segment),
  check (id = species::text || '.' || key)
);

insert into public.animal_categories
  (id, species, key, label_singular, label_plural, path_segment, groups_by_birth_year, allowed_sexes, sort_order)
values
  ('horse.stallion',    'horse',  'stallion',    'Stallion',    'Stallions',    'stallions',    false, '{male}',                         10),
  ('horse.mare',        'horse',  'mare',        'Mare',        'Mares',        'mares',        false, '{female}',                       20),
  ('horse.foal',        'horse',  'foal',        'Foal',        'Foals',        'foals',        true,  '{male,female,gelding,unknown}',  30),
  ('horse.young_horse', 'horse',  'young_horse', 'Young Horse', 'Young Horses', 'young-horses', false, '{male,female,gelding}',          40),
  ('horse.gelding',     'horse',  'gelding',     'Gelding',     'Geldings',     'geldings',     false, '{gelding}',                      50),
  ('cattle.bull',       'cattle', 'bull',        'Bull',        'Bulls',        'bulls',        false, '{male}',                         10),
  ('cattle.cow',        'cattle', 'cow',         'Cow',         'Cows',         'cows',         false, '{female}',                       20),
  ('cattle.heifer',     'cattle', 'heifer',      'Heifer',      'Heifers',      'heifers',      false, '{female}',                       30),
  ('cattle.steer',      'cattle', 'steer',       'Steer',       'Steers',       'steers',       false, '{steer}',                        40),
  ('cattle.calf',       'cattle', 'calf',        'Calf',        'Calves',       'calves',       true,  '{male,female,steer,unknown}',    50);

-- ─── Animals ─────────────────────────────────────────────────────────────────
create table public.animals (
  id                  uuid primary key default gen_random_uuid(),
  ranch_id            uuid not null references public.ranches (id) on delete cascade,
  species             public.species not null,
  record_scope        public.record_scope not null default 'inventory',
  category_id         text references public.animal_categories (id),

  name                text not null check (length(btrim(name)) between 1 and 120),
  registered_name     text check (registered_name is null or length(btrim(registered_name)) between 1 and 160),
  slug                text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  sex                 public.animal_sex not null default 'unknown',
  breed               text check (breed is null or length(btrim(breed)) between 1 and 80),
  color               text check (color is null or length(btrim(color)) between 1 and 80),
  registry            text check (registry is null or length(btrim(registry)) between 1 and 80),
  registration_number text check (registration_number is null or length(btrim(registration_number)) between 1 and 60),

  -- Owners may know only the year ("2026"). Year precision is stored as Jan 1,
  -- month precision as the 1st; the UI displays only what was entered.
  birth_date          date,
  birth_precision     public.birth_precision not null default 'day',
  birth_year          integer generated always as (extract(year from birth_date)::integer) stored,

  sire_id             uuid,
  dam_id              uuid,

  program_status      public.program_status not null default 'active',
  breeding_available  boolean not null default false,
  is_featured         boolean not null default false,
  is_published        boolean not null default false,
  display_order       integer not null default 0,     -- manual ordering within a list

  description         jsonb check (description is null or not private.rich_text_is_empty(description)),
  -- Species-specific structured extras, validated by the app per species,
  -- e.g. cattle: {"ear_tag": "118", "tattoo": "…", "polled": true}
  species_attrs       jsonb not null default '{}' check (jsonb_typeof(species_attrs) = 'object'),

  primary_media_id    uuid,
  is_demo             boolean not null default false,
  archived_at         timestamptz,
  created_by          uuid references auth.users (id) on delete set null,
  updated_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (ranch_id, id),
  unique (ranch_id, slug),

  -- Composite FKs: parents and photos must belong to the SAME ranch.
  foreign key (ranch_id, sire_id) references public.animals (ranch_id, id) on delete set null (sire_id),
  foreign key (ranch_id, dam_id)  references public.animals (ranch_id, id) on delete set null (dam_id),
  foreign key (ranch_id, primary_media_id) references public.media (ranch_id, id)
    on delete set null (primary_media_id),

  check (sire_id is distinct from id and dam_id is distinct from id),
  check (record_scope = 'pedigree_only' or category_id is not null),
  check (record_scope = 'inventory' or not is_featured),
  check (birth_date is null or birth_precision <> 'year'
         or (extract(month from birth_date) = 1 and extract(day from birth_date) = 1)),
  check (birth_date is null or birth_precision <> 'month' or extract(day from birth_date) = 1)
);

create index animals_ranch_listing on public.animals (ranch_id, species, category_id)
  where archived_at is null and record_scope = 'inventory';
create index animals_sire on public.animals (sire_id) where sire_id is not null;
create index animals_dam  on public.animals (dam_id)  where dam_id  is not null;
create index animals_featured on public.animals (ranch_id) where is_featured and archived_at is null;
create index animals_name_search on public.animals (ranch_id, species, lower(name));

create trigger animals_updated_at before update on public.animals
  for each row execute function private.set_updated_at();

-- ─── For-sale listings (1:1, optional) ───────────────────────────────────────
create table public.sale_listings (
  animal_id         uuid primary key,
  ranch_id          uuid not null,
  status            public.sale_status not null default 'available',
  price_mode        public.price_mode not null default 'contact',
  price_cents       bigint check (price_cents is null or price_cents >= 0),
  currency          char(3) not null default 'USD',
  available_on      date,
  location_text     text check (location_text is null or length(btrim(location_text)) between 1 and 120),
  sales_description jsonb check (sales_description is null or not private.rich_text_is_empty(sales_description)),
  sold_on           date,
  show_on_sold_page boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (ranch_id, animal_id) references public.animals (ranch_id, id) on delete cascade,
  check (price_mode <> 'price' or price_cents is not null)
);
create index sale_listings_ranch_status on public.sale_listings (ranch_id, status);

create trigger sale_listings_updated_at before update on public.sale_listings
  for each row execute function private.set_updated_at();

-- ─── Flexible extra information ──────────────────────────────────────────────
-- Short label/value pairs shown in the "Quick Facts" panel.
create table public.animal_facts (
  id         uuid primary key default gen_random_uuid(),
  ranch_id   uuid not null,
  animal_id  uuid not null,
  label      text not null check (length(btrim(label)) between 1 and 60),
  value      text not null check (length(btrim(value)) between 1 and 300),
  sort_order integer not null default 0,
  foreign key (ranch_id, animal_id) references public.animals (ranch_id, id) on delete cascade
);
create index animal_facts_animal on public.animal_facts (animal_id, sort_order);

-- Longer stories: "Breeding notes", "History", "Show record" …
create table public.animal_sections (
  id         uuid primary key default gen_random_uuid(),
  ranch_id   uuid not null,
  animal_id  uuid not null,
  heading    text not null check (length(btrim(heading)) between 1 and 120),
  body       jsonb not null check (not private.rich_text_is_empty(body)),
  sort_order integer not null default 0,
  foreign key (ranch_id, animal_id) references public.animals (ranch_id, id) on delete cascade
);
create index animal_sections_animal on public.animal_sections (animal_id, sort_order);

-- ─── Photos and videos ───────────────────────────────────────────────────────
create table public.animal_media (
  ranch_id   uuid not null,
  animal_id  uuid not null,
  media_id   uuid not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (animal_id, media_id),
  foreign key (ranch_id, animal_id) references public.animals (ranch_id, id) on delete cascade,
  foreign key (ranch_id, media_id)  references public.media   (ranch_id, id) on delete cascade
);
create index animal_media_order on public.animal_media (animal_id, sort_order);
create index animal_media_media on public.animal_media (media_id);

create table public.animal_videos (
  id         uuid primary key default gen_random_uuid(),
  ranch_id   uuid not null,
  animal_id  uuid not null,
  url        text not null check (
               url ~* '^https://(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)/[^\s]+$'),
  title      text,
  sort_order integer not null default 0,
  foreign key (ranch_id, animal_id) references public.animals (ranch_id, id) on delete cascade
);
create index animal_videos_animal on public.animal_videos (animal_id, sort_order);

-- ─── Old URLs keep working after a rename ────────────────────────────────────
create table public.animal_slug_history (
  ranch_id   uuid not null,
  old_slug   text not null,
  animal_id  uuid not null,
  created_at timestamptz not null default now(),
  primary key (ranch_id, old_slug),
  foreign key (ranch_id, animal_id) references public.animals (ranch_id, id) on delete cascade
);
