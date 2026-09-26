-- =============================================================================
-- Happening on the Ranch: back-dated history posts.
--
-- The ranch builds a history from old photos (e.g. moving cattle years ago),
-- so a post's date is chosen by the owner and may be known only to the month
-- or year. Dates are interpreted in the ranch's time zone, so "May 3" never
-- shows as May 2.
--   past published_at   → a history post, filed under its year
--   future published_at → scheduled; visitors see it from that moment
-- =============================================================================

alter table public.ranch_profile
  add column time_zone text not null default 'America/Denver';

create function private.ranch_profile_validate_tz()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  perform now() at time zone new.time_zone;   -- raises for an unknown zone
  return new;
exception when others then
  raise exception '"%" is not a recognised time zone.', new.time_zone using errcode = 'RA014';
end $$;

create trigger ranch_profile_validate_tz before insert or update of time_zone on public.ranch_profile
  for each row execute function private.ranch_profile_validate_tz();

alter table public.posts
  add column date_precision public.birth_precision not null default 'day',
  add constraint posts_published_at_sane check (published_at is null or published_at >= '1850-01-01');

comment on column public.posts.published_at is
  'The date shown on the post, chosen by the owner. Back-dating files it in the history; a future date schedules it.';

-- When the photos were taken (from EXIF during processing), used to suggest a post date.
alter table public.media add column taken_at timestamptz;

-- Normalise month/year-precision dates to noon on the 1st, in the ranch's
-- time zone, so they can never drift into the previous month or year.
create or replace function private.posts_before_write()
returns trigger language plpgsql
set search_path = ''
as $$
declare
  tz text;
  local_ts timestamp;
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

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
    new.date_precision := 'day';
  end if;

  if new.published_at is not null and new.date_precision <> 'day' then
    select coalesce(p.time_zone, 'UTC') into tz from public.ranch_profile p where p.ranch_id = new.ranch_id;
    local_ts := new.published_at at time zone coalesce(tz, 'UTC');
    local_ts := case new.date_precision
                  when 'year'  then make_timestamp(extract(year from local_ts)::int, 1, 1, 12, 0, 0)
                  else              make_timestamp(extract(year from local_ts)::int, extract(month from local_ts)::int, 1, 12, 0, 0)
                end;
    new.published_at := local_ts at time zone coalesce(tz, 'UTC');
  end if;
  return new;
end $$;
