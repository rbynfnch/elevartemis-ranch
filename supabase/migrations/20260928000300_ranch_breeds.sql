-- =============================================================================
-- Breeds: each ranch keeps its own list of breeds per species (Quarter Horse,
-- Appaloosa, Hereford, …). The animal form picks from this list and can add a
-- new breed on the spot.
--
-- animals.breed stays plain text (the public pages, pedigrees and listings read
-- it as is). The database keeps the list and the animals in step:
--   * saving an animal with a breed the list doesn't have yet adds it
--   * "hereford" is stored as the list's spelling, "Hereford" (no duplicates
--     that differ only by capitals), whether it came from the form, a CSV
--     import or a script
--   * renaming a breed renames it on every animal that uses it, atomically
--   * a breed that animals still use can't be deleted
-- =============================================================================

create table public.ranch_breeds (
  id         uuid primary key default gen_random_uuid(),
  ranch_id   uuid not null references public.ranches (id) on delete cascade,
  species    public.species not null,
  name       text not null check (name = btrim(name) and length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

-- One breed name per ranch and species, ignoring capitals.
create unique index ranch_breeds_unique_name on public.ranch_breeds (ranch_id, species, lower(name));

-- Start each ranch's list from the breeds its animals already use.
insert into public.ranch_breeds (ranch_id, species, name)
select a.ranch_id, a.species, min(btrim(a.breed))
from public.animals a
where a.breed is not null and btrim(a.breed) <> ''
group by a.ranch_id, a.species, lower(btrim(a.breed));

-- ─── Keep animals and the list in step ───────────────────────────────────────
create function private.animals_breed_sync()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  clean     text;
  canonical text;
begin
  if new.breed is null then return new; end if;
  clean := btrim(new.breed);
  if clean = '' then
    new.breed := null;
    return new;
  end if;
  select b.name into canonical
  from public.ranch_breeds b
  where b.ranch_id = new.ranch_id and b.species = new.species and lower(b.name) = lower(clean)
  limit 1;
  if canonical is null then
    insert into public.ranch_breeds (ranch_id, species, name) values (new.ranch_id, new.species, clean)
    on conflict do nothing;
    canonical := clean;
  end if;
  new.breed := canonical;
  return new;
end $$;

create trigger animals_breed_sync before insert or update of breed, species on public.animals
  for each row execute function private.animals_breed_sync();

-- Use the list's spelling on animals that already exist.
update public.animals a
   set breed = b.name
  from public.ranch_breeds b
 where a.breed is not null
   and b.ranch_id = a.ranch_id and b.species = a.species
   and lower(b.name) = lower(btrim(a.breed))
   and a.breed is distinct from b.name;

-- A breed that animals still use can't be deleted.
create function private.ranch_breeds_not_in_use()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  select count(*) into n from public.animals a
  where a.ranch_id = old.ranch_id and a.species = old.species and lower(btrim(a.breed)) = lower(old.name);
  if n > 0 then
    raise exception '% % still use %. Change them to another breed first.',
      n, case when n = 1 then 'animal' else 'animals' end, old.name
      using errcode = 'RA017';
  end if;
  return old;
end $$;

create trigger ranch_breeds_not_in_use before delete on public.ranch_breeds
  for each row execute function private.ranch_breeds_not_in_use();

-- ─── Rename: the list entry and every animal that uses it, in one step ───────
-- SECURITY INVOKER, so the owner's own permissions (RLS, two-step verification) apply.
create function public.rename_breed(p_breed uuid, p_name text)
returns void language plpgsql security invoker
set search_path = ''
as $$
declare
  b     public.ranch_breeds;
  clean text := btrim(coalesce(p_name, ''));
begin
  select * into b from public.ranch_breeds r where r.id = p_breed;
  if b.id is null then
    raise exception 'That breed could not be found.' using errcode = 'RA017';
  end if;
  if clean = '' or length(clean) > 80 then
    raise exception 'Use 1 to 80 characters for the breed name.' using errcode = 'RA017';
  end if;
  update public.ranch_breeds r set name = clean where r.id = p_breed;
  update public.animals a set breed = clean
   where a.ranch_id = b.ranch_id and a.species = b.species and lower(btrim(a.breed)) = lower(b.name);
end $$;

revoke all on function public.rename_breed(uuid, text) from public, anon;
grant execute on function public.rename_breed(uuid, text) to authenticated;

-- ─── Access: members of the ranch manage its list; visitors never see it ─────
alter table public.ranch_breeds enable row level security;
revoke insert, update, delete, truncate on public.ranch_breeds from anon;
revoke select on public.ranch_breeds from anon;

create policy "Members manage breeds" on public.ranch_breeds for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Two-step verification when required"
  on public.ranch_breeds as restrictive for all to authenticated
  using (
    (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and ranch_id not in (select private.mfa_required_ranch_ids())))
  with check (
    (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and ranch_id not in (select private.mfa_required_ranch_ids())));
