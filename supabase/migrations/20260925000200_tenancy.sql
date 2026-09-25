-- =============================================================================
-- Tenancy: ranches, the domains that serve them, and who may manage them.
-- Every tenant-owned table in later migrations carries `ranch_id`.
-- =============================================================================

create table public.ranches (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 63),
  name            text not null check (length(btrim(name)) between 1 and 120),
  status          public.ranch_status not null default 'draft',
  enabled_species public.species[] not null default '{horse}'
                  check (cardinality(enabled_species) >= 1),
  -- Elevartemis-controlled feature flags, e.g. {"stallion_services": true}
  features        jsonb not null default '{}' check (jsonb_typeof(features) = 'object'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.ranches is
  'One row per ranch client. draft = viewable preview (noindex); live = launched; suspended = offline.';

create trigger ranches_updated_at before update on public.ranches
  for each row execute function private.set_updated_at();

-- Hostnames are stored lowercase without port or trailing dot.
-- Non-primary hostnames (e.g. www.) redirect to the primary.
create table public.ranch_domains (
  hostname   text primary key
             check (hostname = lower(hostname)
                    and hostname ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$'),
  ranch_id   uuid not null references public.ranches (id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index ranch_domains_one_primary on public.ranch_domains (ranch_id) where is_primary;
create index ranch_domains_ranch on public.ranch_domains (ranch_id);

create table public.ranch_memberships (
  ranch_id   uuid not null references public.ranches (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (ranch_id, user_id)
);
create index ranch_memberships_user on public.ranch_memberships (user_id);
comment on table public.ranch_memberships is
  'Who can manage which ranch. v1 provisions one owner per ranch; roles allow editors later.';

-- Elevartemis staff. No UI or RLS grants in v1; reserved for a future platform console.
create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─── Access helpers used by RLS ──────────────────────────────────────────────
-- SECURITY DEFINER so policies can consult memberships without recursive RLS.
-- Use in policies as:  ranch_id in (select private.my_ranch_ids())
-- The sub-select is evaluated once per statement, not once per row.

create function private.my_ranch_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select m.ranch_id
  from public.ranch_memberships m
  where m.user_id = (select auth.uid());
$$;

create function private.my_owned_ranch_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select m.ranch_id
  from public.ranch_memberships m
  where m.user_id = (select auth.uid()) and m.role = 'owner';
$$;

create function private.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins p where p.user_id = (select auth.uid()));
$$;

-- Ranches whose public site may be served (draft previews included).
create function private.visible_ranch_ids()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select r.id from public.ranches r where r.status <> 'suspended';
$$;

revoke all on function private.my_ranch_ids(), private.my_owned_ranch_ids(),
  private.is_platform_admin(), private.visible_ranch_ids() from public;
grant execute on function private.my_ranch_ids(), private.my_owned_ranch_ids(),
  private.is_platform_admin(), private.visible_ranch_ids() to anon, authenticated, service_role;
