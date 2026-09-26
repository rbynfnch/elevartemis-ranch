-- =============================================================================
-- Per-ranch species configuration (Elevartemis-controlled navigation).
--
-- Platform categories stay the default. A ranch may narrow and reorder them,
-- add a breed heading, and choose which extra pages appear. Example, first
-- ranch's cattle program:
--     Cattle
--       Herefords          ← breed_heading
--         Bulls            ← categories, in this order
--         Yearlings
--         Cows             (appears once a cow is published)
--         For Sale         ← show_for_sale
-- No row = platform defaults (all categories, all pages).
-- =============================================================================

-- Cattle yearlings: roughly 12–24 months, bulls or heifers.
insert into public.animal_categories
  (id, species, key, label_singular, label_plural, path_segment, groups_by_birth_year, allowed_sexes, sort_order)
values
  ('cattle.yearling', 'cattle', 'yearling', 'Yearling', 'Yearlings', 'yearlings', false, '{male,female,steer}', 15);

create table public.ranch_species_settings (
  ranch_id       uuid not null references public.ranches (id) on delete cascade,
  species        public.species not null,
  -- Top-level menu label override, e.g. 'Quarter Horses'. Null → 'Horses' / 'Cattle'.
  nav_label      text check (nav_label is null or length(btrim(nav_label)) between 1 and 40),
  -- Group heading inside the menu and on the overview page, e.g. 'Herefords'.
  breed_heading  text check (breed_heading is null or length(btrim(breed_heading)) between 1 and 60),
  -- Ordered list of category ids this ranch uses. Null → all platform categories.
  categories     text[] check (categories is null or cardinality(categories) >= 1),
  show_retired   boolean not null default true,
  show_reference boolean not null default true,
  show_for_sale  boolean not null default true,
  show_sold      boolean not null default true,
  updated_at     timestamptz not null default now(),
  primary key (ranch_id, species)
);

create trigger ranch_species_settings_updated_at before update on public.ranch_species_settings
  for each row execute function private.set_updated_at();

create function private.ranch_species_settings_validate()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  bad text;
  in_use record;
begin
  if not exists (select 1 from public.ranches r where r.id = new.ranch_id and new.species = any (r.enabled_species)) then
    raise exception 'This ranch doesn''t have % enabled.', new.species using errcode = 'RA013';
  end if;

  if new.categories is not null then
    select c into bad from unnest(new.categories) as c
    where not exists (select 1 from public.animal_categories ac where ac.id = c and ac.species = new.species)
    limit 1;
    if bad is not null then
      raise exception '"%" is not a % category.', bad, new.species using errcode = 'RA013';
    end if;
    if (select count(distinct c) from unnest(new.categories) c) <> cardinality(new.categories) then
      raise exception 'A category is listed twice.' using errcode = 'RA013';
    end if;

    -- Don't strand animals in a category the ranch no longer offers.
    select ac.label_plural as label, count(*) as n into in_use
    from public.animals a join public.animal_categories ac on ac.id = a.category_id
    where a.ranch_id = new.ranch_id and a.species = new.species and a.archived_at is null
      and not (a.category_id = any (new.categories))
    group by ac.label_plural
    limit 1;
    if in_use.n is not null then
      raise exception '% animal(s) are still in %. Move them before removing that category.', in_use.n, in_use.label
        using errcode = 'RA013';
    end if;
  end if;
  return new;
end $$;

create trigger ranch_species_settings_validate before insert or update on public.ranch_species_settings
  for each row execute function private.ranch_species_settings_validate();

-- Animals may only use categories the ranch offers (when it has narrowed them).
create function private.animals_category_offered()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  offered text[];
  label text;
begin
  if new.category_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.category_id is not distinct from old.category_id then return new; end if;
  select s.categories into offered from public.ranch_species_settings s
  where s.ranch_id = new.ranch_id and s.species = new.species;
  if offered is not null and not (new.category_id = any (offered)) then
    select c.label_plural into label from public.animal_categories c where c.id = new.category_id;
    raise exception '% isn''t one of this ranch''s categories.', label
      using errcode = 'RA013', hint = 'Choose one of the categories listed for this ranch.';
  end if;
  return new;
end $$;

create trigger animals_category_offered before insert or update of category_id, species on public.animals
  for each row execute function private.animals_category_offered();

alter table public.ranch_species_settings enable row level security;
revoke insert, update, delete, truncate on public.ranch_species_settings from anon, authenticated;
create policy "Visitors read species settings" on public.ranch_species_settings for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()) or ranch_id in (select private.my_ranch_ids()));
