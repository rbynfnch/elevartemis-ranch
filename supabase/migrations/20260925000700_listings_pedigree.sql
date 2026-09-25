-- =============================================================================
-- Public listing rules, navigation counts, pedigree and offspring.
-- The listing rules live HERE, in one place, so every page and the navigation
-- agree on where an animal appears.
-- =============================================================================

-- Can the current caller see this animal's portfolio?
--   Visitors: published, not archived, ranch-owned, ranch not suspended.
--   Ranch members: anything in their ranch.
create function private.can_view_animal(p_animal uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.animals a
    where a.id = p_animal
      and (
        (a.record_scope = 'inventory' and a.is_published and a.archived_at is null
         and a.ranch_id in (select private.visible_ranch_ids()))
        or a.ranch_id in (select private.my_ranch_ids())
      ));
$$;

create function private.is_public_animal(a public.animals)
returns boolean language sql stable
set search_path = ''
as $$
  select a.record_scope = 'inventory' and a.is_published and a.archived_at is null;
$$;

-- ─── Public animal cards ─────────────────────────────────────────────────────
-- security_invoker: the caller's RLS applies, AND the WHERE clause restricts to
-- public rows, so even a logged-in owner sees only what visitors see here.
--
-- Listing rules:
--   category page  program_status = active   and not sold
--   retired page   program_status = retired  and not sold
--   previous       program_status = reference (previous stallions)
--   for sale       sale status available/pending, not deceased
--   sold           sale status sold and show_on_sold_page
--   deceased       no list page; portfolio still reachable via pedigree/offspring
create view public.public_animal_cards with (security_invoker = true) as
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
  a.updated_at
from public.animals a
join public.animal_categories c on c.id = a.category_id
left join public.sale_listings s on s.animal_id = a.id
left join public.media m on m.id = a.primary_media_id and m.status = 'ready'
where a.record_scope = 'inventory'
  and a.is_published
  and a.archived_at is null
  and a.ranch_id in (select private.visible_ranch_ids());

-- ─── Navigation counts ───────────────────────────────────────────────────────
-- Buckets: a category key ('stallion', 'foal', …) or 'retired' | 'reference' |
-- 'for_sale' | 'sold'. Buckets with zero animals are simply absent, which is
-- how empty categories disappear from navigation.
create function public.public_nav_counts(p_ranch uuid)
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
    (case when v.on_sold_page      then 'sold'         end)
  ) as b(bucket)
  where v.ranch_id = p_ranch and b.bucket is not null
  group by v.species, b.bucket;
$$;

-- ─── Pedigree ────────────────────────────────────────────────────────────────
-- path: '' = the animal itself, 'S' = sire, 'D' = dam, 'SD' = sire's dam …
-- Missing ancestors produce no row; the UI draws only what exists.
-- is_linkable: the ancestor has a public portfolio on this site.
-- Outside ancestors return their notes (for the pedigree popover card).
create function public.get_pedigree(p_animal uuid, p_generations integer default 3)
returns table (
  path            text,
  generation      integer,
  animal_id       uuid,
  name            text,
  registered_name text,
  slug            text,
  species         public.species,
  sex             public.animal_sex,
  breed           text,
  color           text,
  birth_year      integer,
  record_scope    public.record_scope,
  is_linkable     boolean,
  notes           jsonb,
  photo_variants  jsonb,
  photo_focal_x   numeric,
  photo_focal_y   numeric,
  photo_alt       text
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
    m.variants, m.focal_x, m.focal_y, m.alt_text
  from tree t
  join public.animals a on a.id = t.id
  left join public.media m on m.id = a.primary_media_id and m.status = 'ready'
  order by t.gen, t.pos;
$$;

-- ─── Offspring ───────────────────────────────────────────────────────────────
-- Derived from children's sire_id / dam_id. Nothing is entered on the parent.
-- Visitors see public offspring; ranch members also see unpublished ones.
create function public.get_offspring(p_animal uuid)
returns table (
  animal_id             uuid,
  name                  text,
  slug                  text,
  sex                   public.animal_sex,
  category_label        text,
  birth_year            integer,
  is_linkable           boolean,
  parent_role           text,          -- 'sire' | 'dam': the queried animal's role
  other_parent_id       uuid,
  other_parent_name     text,
  other_parent_slug     text,
  other_parent_linkable boolean,
  photo_variants        jsonb,
  photo_focal_x         numeric,
  photo_focal_y         numeric,
  photo_alt             text
)
language sql stable security definer
set search_path = ''
as $$
  select
    c.id, c.name, c.slug, c.sex, cat.label_singular, c.birth_year,
    private.is_public_animal(c),
    case when c.sire_id = p_animal then 'sire' else 'dam' end,
    o.id, o.name, o.slug,
    coalesce(private.is_public_animal(o), false),
    m.variants, m.focal_x, m.focal_y, m.alt_text
  from public.animals c
  left join public.animal_categories cat on cat.id = c.category_id
  left join public.animals o
         on o.id = case when c.sire_id = p_animal then c.dam_id else c.sire_id end
  left join public.media m on m.id = c.primary_media_id and m.status = 'ready'
  where (c.sire_id = p_animal or c.dam_id = p_animal)
    and private.can_view_animal(p_animal)
    and c.archived_at is null
    and (private.is_public_animal(c) or c.ranch_id in (select private.my_ranch_ids()))
  order by c.birth_year desc nulls last, c.name;
$$;

-- ─── Old URL lookup ──────────────────────────────────────────────────────────
create function public.resolve_animal_slug(p_ranch uuid, p_slug text)
returns table (slug text, is_redirect boolean)
language sql stable security definer
set search_path = ''
as $$
  select a.slug, false
  from public.animals a
  where a.ranch_id = p_ranch and a.slug = p_slug and private.can_view_animal(a.id)
  union all
  select a.slug, true
  from public.animal_slug_history h
  join public.animals a on a.id = h.animal_id
  where h.ranch_id = p_ranch and h.old_slug = p_slug and private.can_view_animal(a.id)
  limit 1;
$$;

revoke all on function public.get_pedigree(uuid, integer), public.get_offspring(uuid),
  public.resolve_animal_slug(uuid, text), public.public_nav_counts(uuid) from public;
grant execute on function public.get_pedigree(uuid, integer), public.get_offspring(uuid),
  public.resolve_animal_slug(uuid, text), public.public_nav_counts(uuid)
  to anon, authenticated, service_role;
revoke all on function private.can_view_animal(uuid), private.is_public_animal(public.animals) from public;
grant execute on function private.can_view_animal(uuid), private.is_public_animal(public.animals)
  to anon, authenticated, service_role;
