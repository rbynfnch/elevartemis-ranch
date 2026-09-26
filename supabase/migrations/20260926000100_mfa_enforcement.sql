-- =============================================================================
-- Two-step verification (TOTP), enforced in the database.
--
-- Supabase issues an "aal1" session after a password and "aal2" after a
-- verified authenticator code. If the app were the only check, a stolen
-- password could skip the code screen and call the Data API directly. These
-- RESTRICTIVE policies close that gap. A signed-in user may touch ranch
-- content only when:
--   • their session is aal2, or
--   • they have no verified authenticator AND their ranch doesn't require one.
--
-- A ranch requires two-step verification when
--   ranches.features ->> 'require_mfa' = 'true'   (set by Elevartemis)
--
-- Restrictive policies are AND-ed with the permissive ones in migration 900,
-- so they only ever narrow access. Visitors (anon) are unaffected.
-- =============================================================================

create function private.session_is_aal2()
returns boolean language sql stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

create function private.has_verified_factor()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.mfa_factors f
    where f.user_id = (select auth.uid()) and f.status = 'verified');
$$;

create function private.mfa_required_ranch_ids()
returns setof uuid language sql stable security definer
set search_path = ''
as $$
  select r.id from public.ranches r where coalesce(r.features ->> 'require_mfa', 'false') = 'true';
$$;

revoke all on function private.session_is_aal2(), private.has_verified_factor(),
  private.mfa_required_ranch_ids() from public;
grant execute on function private.session_is_aal2(), private.has_verified_factor(),
  private.mfa_required_ranch_ids() to anon, authenticated, service_role;

-- One restrictive policy per tenant content table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'media', 'ranch_profile', 'ranch_private', 'ranch_branding', 'ranch_seo', 'social_links', 'pages',
    'animals', 'sale_listings', 'animal_facts', 'animal_sections', 'animal_media', 'animal_videos',
    'animal_slug_history', 'hero_slides', 'post_categories', 'posts', 'post_media', 'post_animals', 'faqs'
  ] loop
    execute format($f$
      create policy "Two-step verification when required"
        on public.%I as restrictive for all to authenticated
        using (
          (select private.session_is_aal2())
          or ((select not private.has_verified_factor())
              and ranch_id not in (select private.mfa_required_ranch_ids())))
        with check (
          (select private.session_is_aal2())
          or ((select not private.has_verified_factor())
              and ranch_id not in (select private.mfa_required_ranch_ids())))
    $f$, t);
  end loop;
end $$;

-- Same rule for ranch files in Storage.
create policy "Two-step verification when required"
  on storage.objects as restrictive for all to authenticated
  using (
    bucket_id not in ('ranch-originals', 'ranch-media')
    or (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and (storage.foldername(name))[1] not in (select id::text from private.mfa_required_ranch_ids() as id)))
  with check (
    bucket_id not in ('ranch-originals', 'ranch-media')
    or (select private.session_is_aal2())
    or ((select not private.has_verified_factor())
        and (storage.foldername(name))[1] not in (select id::text from private.mfa_required_ranch_ids() as id)));

-- The admin reads this to decide whether to show the "set up two-step
-- verification" screen before anything else.
create function public.my_mfa_requirements()
returns table (ranch_id uuid, required boolean)
language sql stable security definer
set search_path = ''
as $$
  select m.ranch_id, coalesce(r.features ->> 'require_mfa', 'false') = 'true'
  from public.ranch_memberships m
  join public.ranches r on r.id = m.ranch_id
  where m.user_id = (select auth.uid());
$$;
revoke all on function public.my_mfa_requirements() from public;
grant execute on function public.my_mfa_requirements() to authenticated;
