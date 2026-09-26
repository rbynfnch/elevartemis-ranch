-- =============================================================================
-- Cattle performance: weights and EPDs (Hereford buyers compare these).
-- One optional row per animal. Every field is optional and shown only when
-- filled in. EPDs are a snapshot "as of" a date, because the breed
-- association recalculates them regularly.
-- epds: [{ "trait": "BW", "value": 1.2, "accuracy": 0.45, "percentile": 20 }, …]
-- (trait codes are validated in the app; custom traits are allowed)
-- =============================================================================

create table public.cattle_performance (
  animal_id               uuid primary key,
  ranch_id                uuid not null,
  birth_weight_lb         numeric(6, 1) check (birth_weight_lb is null or birth_weight_lb between 20 and 250),
  weaning_weight_lb       numeric(6, 1) check (weaning_weight_lb is null or weaning_weight_lb between 100 and 1500),
  weaning_weight_adj_lb   numeric(6, 1) check (weaning_weight_adj_lb is null or weaning_weight_adj_lb between 100 and 1500),
  yearling_weight_lb      numeric(6, 1) check (yearling_weight_lb is null or yearling_weight_lb between 200 and 2500),
  yearling_weight_adj_lb  numeric(6, 1) check (yearling_weight_adj_lb is null or yearling_weight_adj_lb between 200 and 2500),
  adg_lb                  numeric(4, 2) check (adg_lb is null or adg_lb between 0 and 10),
  adg_note                text check (adg_note is null or length(btrim(adg_note)) between 1 and 120),  -- e.g. "on test, 112 days"
  epds                    jsonb not null default '[]' check (jsonb_typeof(epds) = 'array' and jsonb_array_length(epds) <= 40),
  epds_as_of              date,
  epds_source             text check (epds_source is null or length(btrim(epds_source)) between 1 and 120),
  updated_at              timestamptz not null default now(),
  foreign key (ranch_id, animal_id) references public.animals (ranch_id, id) on delete cascade,
  check (jsonb_array_length(epds) = 0 or epds_as_of is not null)
);

create trigger cattle_performance_updated_at before update on public.cattle_performance
  for each row execute function private.set_updated_at();

create function private.cattle_performance_before_write()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if (select a.species from public.animals a where a.id = new.animal_id) <> 'cattle' then
    raise exception 'Performance records are for cattle.' using errcode = 'RA015';
  end if;
  return new;
end $$;

create trigger cattle_performance_before_write before insert or update on public.cattle_performance
  for each row execute function private.cattle_performance_before_write();

alter table public.cattle_performance enable row level security;
create policy "Visitors read performance" on public.cattle_performance for select to anon, authenticated
  using (exists (select 1 from public.animals a where a.id = animal_id));
create policy "Members manage performance" on public.cattle_performance for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));
create policy "Two-step verification when required" on public.cattle_performance
  as restrictive for all to authenticated
  using ((select private.session_is_aal2())
         or ((select not private.has_verified_factor()) and ranch_id not in (select private.mfa_required_ranch_ids())))
  with check ((select private.session_is_aal2())
         or ((select not private.has_verified_factor()) and ranch_id not in (select private.mfa_required_ranch_ids())));
