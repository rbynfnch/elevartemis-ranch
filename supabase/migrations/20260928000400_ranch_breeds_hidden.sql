-- =============================================================================
-- Removing a breed from the list now hides it instead of deleting it, so it can
-- be added back with one click from the suggestions on the Breeds page.
--
-- A hidden breed is left out of the animal form's dropdown and the list. Using
-- its name again on an animal (form, CSV import) brings it back automatically.
-- Hiding is held to the same rule as deleting: animals still using a breed
-- keep it in the list.
-- =============================================================================

alter table public.ranch_breeds add column hidden boolean not null default false;

-- Saving an animal with a hidden breed's name brings that breed back.
create or replace function private.animals_breed_sync()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  clean      text;
  canonical  text;
  was_hidden boolean;
begin
  if new.breed is null then return new; end if;
  clean := btrim(new.breed);
  if clean = '' then
    new.breed := null;
    return new;
  end if;
  select b.name, b.hidden into canonical, was_hidden
  from public.ranch_breeds b
  where b.ranch_id = new.ranch_id and b.species = new.species and lower(b.name) = lower(clean)
  limit 1;
  if canonical is null then
    insert into public.ranch_breeds (ranch_id, species, name) values (new.ranch_id, new.species, clean)
    on conflict do nothing;
    canonical := clean;
  elsif was_hidden then
    update public.ranch_breeds b set hidden = false
     where b.ranch_id = new.ranch_id and b.species = new.species and lower(b.name) = lower(canonical);
  end if;
  new.breed := canonical;
  return new;
end $$;

-- Deleting or hiding a breed that animals still use is refused.
create or replace function private.ranch_breeds_not_in_use()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if tg_op = 'UPDATE' and not (new.hidden and not old.hidden) then return new; end if;
  select count(*) into n from public.animals a
  where a.ranch_id = old.ranch_id and a.species = old.species and lower(btrim(a.breed)) = lower(old.name);
  if n > 0 then
    raise exception '% % still use %. Change them to another breed first.',
      n, case when n = 1 then 'animal' else 'animals' end, old.name
      using errcode = 'RA017';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger ranch_breeds_not_hidden_in_use before update of hidden on public.ranch_breeds
  for each row execute function private.ranch_breeds_not_in_use();
