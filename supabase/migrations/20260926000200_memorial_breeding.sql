-- =============================================================================
-- In Memory, owner-confirmed categories, Breeding Services, and documents.
-- =============================================================================

-- ─── In Memory ───────────────────────────────────────────────────────────────
-- Deceased animals (program_status = 'deceased') get their own "In Memory"
-- page, reached from About. Date of death is optional, at any precision.
alter table public.animals
  add column deceased_on date,
  add column deceased_precision public.birth_precision not null default 'year',
  -- Set when the owner chooses to keep an animal in its current category
  -- (e.g. "keep as Foal"), which silences the dashboard suggestion.
  add column category_confirmed_at timestamptz;

alter table public.animals
  add constraint animals_deceased_after_birth
    check (deceased_on is null or birth_date is null or deceased_on >= birth_date);

create function private.animals_normalize_extras()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.program_status <> 'deceased' then
    new.deceased_on := null;
  elsif new.deceased_on is not null then
    if new.deceased_precision = 'year' then
      new.deceased_on := make_date(extract(year from new.deceased_on)::int, 1, 1);
    elsif new.deceased_precision = 'month' then
      new.deceased_on := date_trunc('month', new.deceased_on)::date;
    end if;
  end if;
  -- A new category means a new decision; the owner's earlier override no longer applies.
  if tg_op = 'UPDATE' and new.category_id is distinct from old.category_id
     and new.category_confirmed_at is not distinct from old.category_confirmed_at then
    new.category_confirmed_at := null;
  end if;
  return new;
end $$;

-- Fires after animals_before_write (triggers run in name order).
create trigger animals_normalize_extras
  before insert or update on public.animals
  for each row execute function private.animals_normalize_extras();

-- ─── Documents (PDFs such as breeding contracts) ─────────────────────────────
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  ranch_id     uuid not null references public.ranches (id) on delete cascade,
  storage_path text not null,
  file_name    text not null check (length(btrim(file_name)) between 1 and 200),
  title        text check (title is null or length(btrim(title)) between 1 and 200),
  mime_type    text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  bytes        bigint check (bytes >= 0),
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (ranch_id, id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ranch-documents', 'ranch-documents', true, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "Members read their documents" on storage.objects for select to authenticated
  using (bucket_id = 'ranch-documents' and (storage.foldername(name))[1] in (select private.my_ranch_folders()));
create policy "Members upload documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'ranch-documents' and (storage.foldername(name))[1] in (select private.my_ranch_folders()));
create policy "Members update documents" on storage.objects for update to authenticated
  using (bucket_id = 'ranch-documents' and (storage.foldername(name))[1] in (select private.my_ranch_folders()))
  with check (bucket_id = 'ranch-documents' and (storage.foldername(name))[1] in (select private.my_ranch_folders()));
create policy "Members delete documents" on storage.objects for delete to authenticated
  using (bucket_id = 'ranch-documents' and (storage.foldername(name))[1] in (select private.my_ranch_folders()));
create policy "Two-step verification when required (documents)"
  on storage.objects as restrictive for all to authenticated
  using (
    bucket_id <> 'ranch-documents'
    or (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and (storage.foldername(name))[1] not in (select id::text from private.mfa_required_ranch_ids() as id)))
  with check (
    bucket_id <> 'ranch-documents'
    or (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and (storage.foldername(name))[1] not in (select id::text from private.mfa_required_ranch_ids() as id)));

-- ─── Breeding Services ───────────────────────────────────────────────────────
-- One optional row per breeding male. Shown on the portfolio when the animal
-- is marked breeding_available. Column names are species-neutral so bulls
-- (AI sires) can use the same structure; the UI supplies horse or cattle
-- wording. Structured fees and statuses let a future Stallion Services page
-- list and compare sires without re-entering anything.
create type public.breeding_status as enum ('available', 'private_treaty', 'retired');

create table public.breeding_services (
  animal_id                  uuid primary key,
  ranch_id                   uuid not null,
  status                     public.breeding_status not null default 'available',
  stud_fee_cents             bigint check (stud_fee_cents is null or stud_fee_cents >= 0),
  booking_fee_cents          bigint check (booking_fee_cents is null or booking_fee_cents >= 0),
  collection_fee_cents       bigint check (collection_fee_cents is null or collection_fee_cents >= 0),
  currency                   char(3) not null default 'USD',
  breeding_season            text check (breeding_season is null or length(btrim(breeding_season)) between 1 and 120),
  service_types              text[] not null default '{}'
                             check (service_types <@ array['live_cover', 'fresh', 'cooled', 'frozen', 'other']),
  service_type_other         text check (service_type_other is null or length(btrim(service_type_other)) between 1 and 80),
  shipping_info              jsonb check (shipping_info is null or not private.rich_text_is_empty(shipping_info)),
  female_requirements        jsonb check (female_requirements is null or not private.rich_text_is_empty(female_requirements)),
  live_offspring_guarantee   boolean,
  live_offspring_guarantee_terms text
                             check (live_offspring_guarantee_terms is null
                                    or length(btrim(live_offspring_guarantee_terms)) between 1 and 300),
  contract_document_id       uuid,
  contract_url               text check (contract_url is null or (contract_url ~* '^https://[^\s]+$' and length(contract_url) <= 500)),
  additional_terms           jsonb check (additional_terms is null or not private.rich_text_is_empty(additional_terms)),
  cta_label                  text check (cta_label is null or length(btrim(cta_label)) between 1 and 40),
  cta_url                    text check (cta_url is null or (cta_url ~* '^https://[^\s]+$' and length(cta_url) <= 500)),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  foreign key (ranch_id, animal_id) references public.animals (ranch_id, id) on delete cascade,
  foreign key (ranch_id, contract_document_id) references public.documents (ranch_id, id)
    on delete set null (contract_document_id),
  check (service_type_other is null or 'other' = any (service_types))
);

create trigger breeding_services_updated_at before update on public.breeding_services
  for each row execute function private.set_updated_at();

create function private.breeding_services_before_write()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  a public.animals;
begin
  select * into a from public.animals where id = new.animal_id;
  if a.record_scope <> 'inventory' or a.sex <> 'male' then
    raise exception 'Breeding services can only be added to one of your stallions or bulls.'
      using errcode = 'RA012';
  end if;
  return new;
end $$;

create trigger breeding_services_before_write before insert or update on public.breeding_services
  for each row execute function private.breeding_services_before_write();

-- A breeding male can't later be recorded as a gelding/steer or female while
-- breeding details exist.
create function private.animals_guard_breeding()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if new.sex <> 'male' and exists (select 1 from public.breeding_services b where b.animal_id = new.id) then
    raise exception 'Remove % from breeding services before changing the sex.', new.name
      using errcode = 'RA012';
  end if;
  return new;
end $$;

create trigger animals_guard_breeding before update of sex on public.animals
  for each row execute function private.animals_guard_breeding();

-- ─── RLS for the new tables ──────────────────────────────────────────────────
alter table public.documents enable row level security;
alter table public.breeding_services enable row level security;

create policy "Visitors read breeding services" on public.breeding_services for select to anon, authenticated
  using (exists (select 1 from public.animals a where a.id = animal_id));
create policy "Members manage breeding services" on public.breeding_services for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

-- Visitors see only documents attached to something public.
create policy "Visitors read published documents" on public.documents for select to anon, authenticated
  using (exists (select 1 from public.breeding_services b where b.contract_document_id = id)
         or ranch_id in (select private.my_ranch_ids()));
create policy "Members manage documents" on public.documents for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Two-step verification when required" on public.breeding_services
  as restrictive for all to authenticated
  using ((select private.session_is_aal2())
         or ((select not private.has_verified_factor()) and ranch_id not in (select private.mfa_required_ranch_ids())))
  with check ((select private.session_is_aal2())
         or ((select not private.has_verified_factor()) and ranch_id not in (select private.mfa_required_ranch_ids())));
create policy "Two-step verification when required" on public.documents
  as restrictive for all to authenticated
  using ((select private.session_is_aal2())
         or ((select not private.has_verified_factor()) and ranch_id not in (select private.mfa_required_ranch_ids())))
  with check ((select private.session_is_aal2())
         or ((select not private.has_verified_factor()) and ranch_id not in (select private.mfa_required_ranch_ids())));

-- ─── Listing view: add memorial + breeding status (columns appended) ─────────
create or replace view public.public_animal_cards with (security_invoker = true) as
select
  a.id, a.ranch_id, a.species,
  a.category_id, c.key as category_key, c.label_singular as category_label,
  c.path_segment as category_path, c.groups_by_birth_year,
  a.name, a.registered_name, a.slug, a.sex, a.breed, a.color,
  a.birth_date, a.birth_precision, a.birth_year,
  a.program_status, a.breeding_available, a.is_featured, a.display_order,
  s.status as sale_status, s.price_mode, s.price_cents, s.currency,
  m.id as photo_id, m.variants as photo_variants, m.width as photo_width,
  m.height as photo_height, m.focal_x as photo_focal_x, m.focal_y as photo_focal_y,
  m.alt_text as photo_alt, m.blur_data_url as photo_blur,
  (a.program_status = 'active'  and s.status is distinct from 'sold') as on_category_page,
  (a.program_status = 'retired' and s.status is distinct from 'sold') as on_retired_page,
  (a.program_status = 'reference')                                    as on_reference_page,
  coalesce(s.status in ('available', 'pending') and a.program_status <> 'deceased', false)
                                                                      as on_for_sale_page,
  coalesce(s.status = 'sold' and s.show_on_sold_page, false)          as on_sold_page,
  a.updated_at,
  (a.program_status = 'deceased')                                     as on_memorial_page,
  a.deceased_on, a.deceased_precision,
  case when a.breeding_available then coalesce(b.status, 'available') end as breeding_status
from public.animals a
join public.animal_categories c on c.id = a.category_id
left join public.sale_listings s on s.animal_id = a.id
left join public.breeding_services b on b.animal_id = a.id
left join public.media m on m.id = a.primary_media_id and m.status = 'ready'
where a.record_scope = 'inventory'
  and a.is_published
  and a.archived_at is null
  and a.ranch_id in (select private.visible_ranch_ids());

-- Adds the 'memorial' bucket.
create or replace function public.public_nav_counts(p_ranch uuid)
returns table (species public.species, bucket text, total integer)
language sql stable security invoker
set search_path = ''
as $$
  select v.species, b.bucket, count(*)::integer
  from public.public_animal_cards v
  cross join lateral (values
    (case when v.on_category_page  then v.category_key end),
    (case when v.on_retired_page   then 'retired'      end),
    (case when v.on_reference_page then 'reference'    end),
    (case when v.on_for_sale_page  then 'for_sale'     end),
    (case when v.on_sold_page      then 'sold'         end),
    (case when v.on_memorial_page  then 'memorial'     end)
  ) as b(bucket)
  where v.ranch_id = p_ranch and b.bucket is not null
  group by v.species, b.bucket;
$$;

-- For a future Stallion Services page: every public sire currently offered.
create view public.public_breeding_services with (security_invoker = true) as
select v.id as animal_id, v.ranch_id, v.species, v.name, v.slug, v.breed, v.birth_year,
       v.photo_variants, v.photo_focal_x, v.photo_focal_y, v.photo_alt,
       b.status, b.stud_fee_cents, b.currency, b.service_types, b.breeding_season
from public.public_animal_cards v
join public.breeding_services b on b.animal_id = v.id
where v.breeding_available and b.status in ('available', 'private_treaty');
