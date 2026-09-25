-- =============================================================================
-- Media: one row per uploaded photo. Files live in Storage:
--   ranch-originals/{ranch_id}/{media_id}/original.{ext}   (private)
--   ranch-media/{ranch_id}/{media_id}/{width}.webp          (public CDN)
-- `variants` records what was generated, e.g.
--   {"320": {"path": "…/320.webp", "w": 320, "h": 213}, "640": {…}, …}
-- =============================================================================

create table public.media (
  id            uuid primary key default gen_random_uuid(),
  ranch_id      uuid not null references public.ranches (id) on delete cascade,
  original_path text,
  variants      jsonb not null default '{}' check (jsonb_typeof(variants) = 'object'),
  width         integer check (width > 0),
  height        integer check (height > 0),
  bytes         bigint check (bytes >= 0),
  mime_type     text,
  blur_data_url text check (blur_data_url is null or length(blur_data_url) <= 4000),
  -- Focal point, 0–1 from the top-left. Drives object-position for every crop.
  focal_x       numeric(4, 3) not null default 0.5 check (focal_x between 0 and 1),
  focal_y       numeric(4, 3) not null default 0.5 check (focal_y between 0 and 1),
  alt_text      text check (alt_text is null or length(btrim(alt_text)) between 1 and 300),
  caption       text check (caption is null or length(btrim(caption)) between 1 and 500),
  status        public.media_status not null default 'processing',
  in_gallery    boolean not null default false,
  gallery_sort  integer not null default 0,
  is_demo       boolean not null default false,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Target for composite foreign keys, so a row in ranch A can never point
  -- at a photo belonging to ranch B.
  unique (ranch_id, id)
);
create index media_gallery on public.media (ranch_id, gallery_sort) where in_gallery;

create trigger media_updated_at before update on public.media
  for each row execute function private.set_updated_at();
