-- =============================================================================
-- Elevartemis Ranch Platform · Foundation
-- Extensions, the `private` schema (never exposed through the Data API),
-- enumerated types, and small shared helpers.
-- =============================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Functions used by RLS policies and triggers live here. The schema is NOT in
-- the API's exposed schemas, so nothing in it is callable over HTTP.
create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- ─── Enumerated types ────────────────────────────────────────────────────────
-- Adding a value later: `alter type … add value …` in a new migration.

create type public.species         as enum ('horse', 'cattle');
create type public.ranch_status    as enum ('draft', 'live', 'suspended');
create type public.member_role     as enum ('owner', 'editor');
create type public.record_scope    as enum ('inventory', 'pedigree_only');
create type public.animal_sex      as enum ('male', 'female', 'gelding', 'steer', 'unknown');
create type public.birth_precision as enum ('year', 'month', 'day');
create type public.program_status  as enum ('active', 'retired', 'reference', 'deceased');
create type public.sale_status     as enum ('available', 'pending', 'sold');
create type public.price_mode      as enum ('price', 'contact', 'hidden');
create type public.media_status    as enum ('processing', 'ready', 'failed');
create type public.cta_kind        as enum ('none', 'page', 'category', 'animal', 'external');
create type public.post_status     as enum ('draft', 'published');
create type public.social_platform as enum
  ('facebook', 'instagram', 'youtube', 'tiktok', 'x', 'linkedin', 'pinterest', 'other');
-- Internal destinations a hero-slide button can point at.
create type public.site_page as enum
  ('home', 'about', 'horses', 'cattle', 'for_sale', 'horses_for_sale', 'cattle_for_sale',
   'gallery', 'updates', 'faq', 'contact');

-- ─── Shared helpers ──────────────────────────────────────────────────────────

create function private.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- "Blue Star's Café" → "blue-stars-cafe"
create function private.slugify(input text)
returns text language sql immutable strict
set search_path = ''
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(
        regexp_replace(lower(extensions.unaccent(input)), '[''’]', '', 'g'),
        '[^a-z0-9]+', '-', 'g')),
      ''),
    'item');
$$;

-- True when a Tiptap/ProseMirror JSON document contains no visible text.
-- Used by CHECKs so "empty" rich text is stored as NULL, never as an empty doc.
create function private.rich_text_is_empty(doc jsonb)
returns boolean language sql immutable
set search_path = ''
as $$
  select doc is null
      or jsonb_typeof(doc) <> 'object'
      or not jsonb_path_exists(doc, 'lax $.**.text ? (@ like_regex "\\S")')
      and not jsonb_path_exists(doc, 'lax $.** ? (@.type == "image")');
$$;
