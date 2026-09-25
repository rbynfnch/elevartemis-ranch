-- =============================================================================
-- Animal integrity rules, enforced in the database so every client (admin UI,
-- scripts, future apps) gets the same guarantees.
--
-- Error codes (SQLSTATE class "RA") are mapped to plain-language messages in
-- the admin. The messages below are already written for ranch owners.
--   RA001 category doesn't match species     RA006 parent species mismatch
--   RA002 sex not allowed for category       RA007 would create a loop
--   RA003 sire can't be female               RA008 sex change conflicts with offspring
--   RA004 dam must be female                 RA009 species change conflicts with relatives
--   RA005 outside ancestor can't be for sale RA010 primary photo not attached
-- =============================================================================

-- ─── Slugs ───────────────────────────────────────────────────────────────────
create function private.unique_animal_slug(p_ranch uuid, p_base text, p_exclude uuid)
returns text language plpgsql stable
set search_path = ''
as $$
declare
  base      text := left(private.slugify(p_base), 72);
  candidate text := base;
  n         integer := 1;
begin
  loop
    exit when not exists (
      select 1 from public.animals a
      where a.ranch_id = p_ranch and a.slug = candidate and a.id is distinct from p_exclude)
    and not exists (
      select 1 from public.animal_slug_history h
      where h.ranch_id = p_ranch and h.old_slug = candidate and h.animal_id is distinct from p_exclude);
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end $$;

-- ─── Main validation trigger ─────────────────────────────────────────────────
create function private.animals_before_write()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  cat    public.animal_categories;
  parent public.animals;
begin
  -- Slug: generate when missing; always normalise.
  if new.slug is null or btrim(new.slug) = '' then
    new.slug := private.unique_animal_slug(new.ranch_id, new.name, new.id);
  else
    new.slug := private.slugify(new.slug);
  end if;

  -- Birth date: store only the precision the owner entered.
  if new.birth_date is not null then
    if new.birth_precision = 'year' then
      new.birth_date := make_date(extract(year from new.birth_date)::int, 1, 1);
    elsif new.birth_precision = 'month' then
      new.birth_date := date_trunc('month', new.birth_date)::date;
    end if;
  end if;

  -- Outside ancestors are never featured.
  if new.record_scope = 'pedigree_only' then
    new.is_featured := false;
  end if;

  -- Category must fit species and sex.
  if new.category_id is not null then
    select * into cat from public.animal_categories c where c.id = new.category_id;
    if cat.species <> new.species then
      raise exception '"%" is a % category, but this animal is a %.',
        cat.label_singular, cat.species, new.species
        using errcode = 'RA001';
    end if;
    if not (new.sex = any (cat.allowed_sexes)) then
      raise exception 'A % can''t be recorded as %.', lower(cat.label_singular), new.sex
        using errcode = 'RA002',
              hint = 'Change the sex or choose a different category.';
    end if;
  end if;

  -- Sire checks. (A gelding/steer may still be a sire: he may have been cut later.)
  if new.sire_id is not null
     and (tg_op = 'INSERT' or new.sire_id is distinct from old.sire_id
          or new.species is distinct from old.species) then
    select * into parent from public.animals a where a.id = new.sire_id;
    if parent.species <> new.species then
      raise exception '% is a %, so can''t be the sire of a %.', parent.name, parent.species, new.species
        using errcode = 'RA006';
    end if;
    if parent.sex = 'female' then
      raise exception '% is female, so can''t be a sire.', parent.name
        using errcode = 'RA003';
    end if;
  end if;

  -- Dam checks.
  if new.dam_id is not null
     and (tg_op = 'INSERT' or new.dam_id is distinct from old.dam_id
          or new.species is distinct from old.species) then
    select * into parent from public.animals a where a.id = new.dam_id;
    if parent.species <> new.species then
      raise exception '% is a %, so can''t be the dam of a %.', parent.name, parent.species, new.species
        using errcode = 'RA006';
    end if;
    if parent.sex <> 'female' then
      raise exception '% isn''t recorded as female, so can''t be a dam.', parent.name
        using errcode = 'RA004';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    -- No loops: this animal can't be its own ancestor.
    if (new.sire_id is distinct from old.sire_id or new.dam_id is distinct from old.dam_id)
       and exists (
         with recursive up(id, depth) as (
           select unnest(array[new.sire_id, new.dam_id]), 1
           union
           select p.parent_id, up.depth + 1
           from up
           join public.animals a on a.id = up.id
           cross join lateral (values (a.sire_id), (a.dam_id)) as p(parent_id)
           where p.parent_id is not null and up.depth < 60
         )
         select 1 from up where up.id = new.id) then
      raise exception '% can''t be their own ancestor. Check the sire and dam.', new.name
        using errcode = 'RA007';
    end if;

    -- Sex changes must stay consistent with recorded offspring.
    if new.sex is distinct from old.sex then
      if new.sex = 'female'
         and exists (select 1 from public.animals c where c.sire_id = new.id) then
        raise exception '% is recorded as the sire of other animals, so can''t be changed to female.', new.name
          using errcode = 'RA008';
      end if;
      if new.sex <> 'female'
         and exists (select 1 from public.animals c where c.dam_id = new.id) then
        raise exception '% is recorded as the dam of other animals, so must stay female.', new.name
          using errcode = 'RA008';
      end if;
    end if;

    -- Species changes must stay consistent with parents and offspring.
    if new.species is distinct from old.species
       and exists (select 1 from public.animals c
                   where (c.sire_id = new.id or c.dam_id = new.id) and c.species <> new.species) then
      raise exception '% has offspring recorded as %, so the species can''t change.', new.name, old.species
        using errcode = 'RA009';
    end if;

    -- Outside ancestors can't carry a sale listing.
    if new.record_scope = 'pedigree_only' and old.record_scope = 'inventory'
       and exists (select 1 from public.sale_listings s where s.animal_id = new.id) then
      raise exception 'Remove the For Sale details from % before moving it to Outside Ancestors.', new.name
        using errcode = 'RA005';
    end if;
  end if;

  -- The main photo must be one of this animal's photos.
  if new.primary_media_id is not null
     and (tg_op = 'INSERT' or new.primary_media_id is distinct from old.primary_media_id)
     and not exists (select 1 from public.animal_media m
                     where m.animal_id = new.id and m.media_id = new.primary_media_id) then
    raise exception 'The main photo must be one of this animal''s photos.'
      using errcode = 'RA010';
  end if;

  return new;
end $$;

create trigger animals_before_write
  before insert or update on public.animals
  for each row execute function private.animals_before_write();

-- ─── Slug history (old URLs redirect) ────────────────────────────────────────
create function private.animals_after_write_slug()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  -- A slug in use by a live animal is no longer a redirect.
  delete from public.animal_slug_history h
  where h.ranch_id = new.ranch_id and h.old_slug = new.slug;

  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    insert into public.animal_slug_history (ranch_id, old_slug, animal_id)
    values (new.ranch_id, old.slug, new.id)
    on conflict (ranch_id, old_slug) do update set animal_id = excluded.animal_id, created_at = now();
  end if;
  return null;
end $$;

create trigger animals_after_write_slug
  after insert or update of slug on public.animals
  for each row execute function private.animals_after_write_slug();

-- ─── Sale listings ───────────────────────────────────────────────────────────
create function private.sale_listings_before_write()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  scope public.record_scope;
  animal_name text;
begin
  select a.record_scope, a.name into scope, animal_name from public.animals a where a.id = new.animal_id;
  if scope = 'pedigree_only' then
    raise exception '% is an outside ancestor. Add it to your animals before listing it for sale.', animal_name
      using errcode = 'RA005';
  end if;

  if new.status = 'sold' and new.sold_on is null
     and (tg_op = 'INSERT' or old.status is distinct from 'sold') then
    new.sold_on := current_date;
  end if;
  if new.status <> 'sold' then
    new.sold_on := null;
  end if;
  return new;
end $$;

create trigger sale_listings_before_write
  before insert or update on public.sale_listings
  for each row execute function private.sale_listings_before_write();

-- ─── Main photo bookkeeping ──────────────────────────────────────────────────
-- First photo becomes the main photo; removing the main photo promotes the next.
create function private.animal_media_after_insert()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  update public.animals a
     set primary_media_id = new.media_id
   where a.id = new.animal_id and a.primary_media_id is null;
  return null;
end $$;

create trigger animal_media_after_insert
  after insert on public.animal_media
  for each row execute function private.animal_media_after_insert();

create function private.animal_media_after_delete()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  update public.animals a
     set primary_media_id = (
           select m.media_id from public.animal_media m
           where m.animal_id = old.animal_id
           order by m.sort_order, m.created_at
           limit 1)
   where a.id = old.animal_id
     and (a.primary_media_id is null or a.primary_media_id = old.media_id);
  return null;
end $$;

create trigger animal_media_after_delete
  after delete on public.animal_media
  for each row execute function private.animal_media_after_delete();
