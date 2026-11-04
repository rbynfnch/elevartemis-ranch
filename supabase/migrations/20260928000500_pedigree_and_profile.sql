-- =============================================================================
-- Pedigree cards and the animal profile.
--
-- 1. get_pedigree also returns each ancestor's registry and registration number
--    ("AQHA #2706274"). Outside ancestors always show them; a ranch animal that
--    isn't published (so has no page) shows only its name, as before.
-- 2. Each animal can carry a one-line tagline and up to four short highlights
--    ("Ranch Proven", "Trail Ready"), both optional.
-- =============================================================================

drop function public.get_pedigree(uuid, integer);

create function public.get_pedigree(p_animal uuid, p_generations integer default 3)
returns table (
  path                text,
  generation          integer,
  animal_id           uuid,
  name                text,
  registered_name     text,
  slug                text,
  species             public.species,
  sex                 public.animal_sex,
  breed               text,
  color               text,
  birth_year          integer,
  record_scope        public.record_scope,
  is_linkable         boolean,
  notes               jsonb,
  photo_variants      jsonb,
  photo_focal_x       numeric,
  photo_focal_y       numeric,
  photo_alt           text,
  registry            text,
  registration_number text
)
language sql stable security definer
set search_path = ''
as $$
  with recursive tree(id, pos, gen) as (
    select a.id, ''::text, 0
    from public.animals a
    where a.id = p_animal and private.can_view_animal(p_animal)
    union all
    select x.parent_id, t.pos || x.letter, t.gen + 1
    from tree t
    join public.animals c on c.id = t.id
    cross join lateral (values (c.sire_id, 'S'), (c.dam_id, 'D')) as x(parent_id, letter)
    where x.parent_id is not null
      and t.gen < least(greatest(p_generations, 1), 5)
  )
  select
    t.pos, t.gen, a.id, a.name, a.registered_name, a.slug, a.species, a.sex,
    a.breed, a.color, a.birth_year, a.record_scope,
    private.is_public_animal(a) and t.gen > 0,
    case when a.record_scope = 'pedigree_only' then a.description end,
    m.variants, m.focal_x, m.focal_y, m.alt_text,
    case when a.record_scope = 'pedigree_only' or private.is_public_animal(a) then a.registry end,
    case when a.record_scope = 'pedigree_only' or private.is_public_animal(a) then a.registration_number end
  from tree t
  join public.animals a on a.id = t.id
  left join public.media m on m.id = a.primary_media_id and m.status = 'ready'
  order by t.gen, t.pos;
$$;

revoke all on function public.get_pedigree(uuid, integer) from public;
grant execute on function public.get_pedigree(uuid, integer) to anon, authenticated, service_role;

alter table public.animals
  add column tagline    text check (tagline is null or length(btrim(tagline)) between 1 and 160),
  add column highlights text[] not null default '{}' check (cardinality(highlights) <= 4);
