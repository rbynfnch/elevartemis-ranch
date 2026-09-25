-- =============================================================================
-- Hostname → ranch resolution, called by the Next.js proxy on each request
-- (results are cached in memory for a minute per server instance).
-- Returns nothing for unknown hosts and for suspended ranches.
-- =============================================================================

create function public.resolve_host(p_hostname text)
returns table (ranch_id uuid, ranch_slug text, ranch_status public.ranch_status,
               is_primary boolean, primary_hostname text)
language sql stable security invoker
set search_path = ''
as $$
  select r.id, r.slug, r.status, d.is_primary,
         coalesce((select p.hostname from public.ranch_domains p
                   where p.ranch_id = r.id and p.is_primary), d.hostname)
  from public.ranch_domains d
  join public.ranches r on r.id = d.ranch_id
  where d.hostname = lower(p_hostname) and r.status <> 'suspended';
$$;

-- Fallback for local development and preview deployments on unknown hosts.
create function public.resolve_ranch_slug(p_slug text)
returns table (ranch_id uuid, ranch_slug text, ranch_status public.ranch_status,
               is_primary boolean, primary_hostname text)
language sql stable security invoker
set search_path = ''
as $$
  select r.id, r.slug, r.status, false,
         (select p.hostname from public.ranch_domains p where p.ranch_id = r.id and p.is_primary)
  from public.ranches r
  where r.slug = p_slug and r.status <> 'suspended';
$$;

grant execute on function public.resolve_host(text), public.resolve_ranch_slug(text)
  to anon, authenticated, service_role;
