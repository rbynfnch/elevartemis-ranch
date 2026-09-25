-- =============================================================================
-- Row-Level Security
--
-- Pattern
--   visitors (anon + authenticated)  read published, non-archived rows of
--                                    non-suspended ranches
--   ranch members                    full access to their own ranch's content
--                                    via  ranch_id in (select private.my_ranch_ids())
--   service role                     bypasses RLS (server-only: provisioning,
--                                    contact form email lookup, image processing)
--
-- Elevartemis-only tables (ranches, ranch_domains, ranch_branding, ranch_seo,
-- memberships, animal_categories) have NO write policies for clients at all.
-- =============================================================================

alter table public.ranches            enable row level security;
alter table public.ranch_domains      enable row level security;
alter table public.ranch_memberships  enable row level security;
alter table public.platform_admins    enable row level security;
alter table public.media              enable row level security;
alter table public.ranch_profile      enable row level security;
alter table public.ranch_private      enable row level security;
alter table public.ranch_branding     enable row level security;
alter table public.ranch_seo          enable row level security;
alter table public.social_links       enable row level security;
alter table public.pages              enable row level security;
alter table public.animal_categories  enable row level security;
alter table public.animals            enable row level security;
alter table public.sale_listings      enable row level security;
alter table public.animal_facts       enable row level security;
alter table public.animal_sections    enable row level security;
alter table public.animal_media       enable row level security;
alter table public.animal_videos      enable row level security;
alter table public.animal_slug_history enable row level security;
alter table public.hero_slides        enable row level security;
alter table public.post_categories    enable row level security;
alter table public.posts              enable row level security;
alter table public.post_media         enable row level security;
alter table public.post_animals       enable row level security;
alter table public.faqs               enable row level security;

-- Belt and braces: clients can never write platform tables, even if a policy
-- were added by mistake later.
revoke insert, update, delete, truncate on
  public.ranches, public.ranch_domains, public.ranch_memberships, public.platform_admins,
  public.ranch_branding, public.ranch_seo, public.animal_categories, public.animal_slug_history
  from anon, authenticated;
-- Settings rows are created by trigger; owners may only update them.
revoke insert, delete, truncate on public.ranch_profile, public.ranch_private, public.pages
  from anon, authenticated;
-- Visitors never write anything.
revoke insert, update, delete, truncate on all tables in schema public from anon;

-- ─── Platform tables ─────────────────────────────────────────────────────────
create policy "Visitors see non-suspended ranches"
  on public.ranches for select to anon, authenticated
  using (status <> 'suspended' or id in (select private.my_ranch_ids()));

create policy "Visitors resolve domains"
  on public.ranch_domains for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()));

create policy "Users see their own memberships"
  on public.ranch_memberships for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins see their own admin row"
  on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Everyone reads categories"
  on public.animal_categories for select to anon, authenticated
  using (true);

-- ─── Settings ────────────────────────────────────────────────────────────────
create policy "Visitors read profile" on public.ranch_profile for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()) or ranch_id in (select private.my_ranch_ids()));
create policy "Members update profile" on public.ranch_profile for update to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Members read private settings" on public.ranch_private for select to authenticated
  using (ranch_id in (select private.my_ranch_ids()));
create policy "Owners update private settings" on public.ranch_private for update to authenticated
  using (ranch_id in (select private.my_owned_ranch_ids()))
  with check (ranch_id in (select private.my_owned_ranch_ids()));

create policy "Visitors read branding" on public.ranch_branding for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()) or ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read SEO settings" on public.ranch_seo for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()) or ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read social links" on public.social_links for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()) or ranch_id in (select private.my_ranch_ids()));
create policy "Members manage social links" on public.social_links for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read pages" on public.pages for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()) or ranch_id in (select private.my_ranch_ids()));
create policy "Members update pages" on public.pages for update to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

-- ─── Media ───────────────────────────────────────────────────────────────────
-- Ready media metadata is public (the image files are on a public CDN anyway).
create policy "Visitors read ready media" on public.media for select to anon, authenticated
  using ((status = 'ready' and ranch_id in (select private.visible_ranch_ids()))
         or ranch_id in (select private.my_ranch_ids()));
create policy "Members manage media" on public.media for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

-- ─── Animals ─────────────────────────────────────────────────────────────────
create policy "Visitors read public animals" on public.animals for select to anon, authenticated
  using ((record_scope = 'inventory' and is_published and archived_at is null
          and ranch_id in (select private.visible_ranch_ids()))
         or ranch_id in (select private.my_ranch_ids()));
create policy "Members add animals" on public.animals for insert to authenticated
  with check (ranch_id in (select private.my_ranch_ids()));
create policy "Members edit animals" on public.animals for update to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));
-- Permanent deletion only from Recently Deleted.
create policy "Members permanently delete archived animals" on public.animals for delete to authenticated
  using (ranch_id in (select private.my_ranch_ids()) and archived_at is not null);

-- Child tables of animals: visible when the parent animal is visible.
create policy "Visitors read sale listings" on public.sale_listings for select to anon, authenticated
  using (exists (select 1 from public.animals a where a.id = animal_id));
create policy "Members manage sale listings" on public.sale_listings for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read facts" on public.animal_facts for select to anon, authenticated
  using (exists (select 1 from public.animals a where a.id = animal_id));
create policy "Members manage facts" on public.animal_facts for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read sections" on public.animal_sections for select to anon, authenticated
  using (exists (select 1 from public.animals a where a.id = animal_id));
create policy "Members manage sections" on public.animal_sections for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read animal photos" on public.animal_media for select to anon, authenticated
  using (exists (select 1 from public.animals a where a.id = animal_id));
create policy "Members manage animal photos" on public.animal_media for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read animal videos" on public.animal_videos for select to anon, authenticated
  using (exists (select 1 from public.animals a where a.id = animal_id));
create policy "Members manage animal videos" on public.animal_videos for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Members read slug history" on public.animal_slug_history for select to authenticated
  using (ranch_id in (select private.my_ranch_ids()));

-- ─── Homepage slides ─────────────────────────────────────────────────────────
create policy "Visitors read active slides" on public.hero_slides for select to anon, authenticated
  using ((is_active and archived_at is null and ranch_id in (select private.visible_ranch_ids()))
         or ranch_id in (select private.my_ranch_ids()));
create policy "Members manage slides" on public.hero_slides for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

-- ─── Posts ───────────────────────────────────────────────────────────────────
create policy "Visitors read post categories" on public.post_categories for select to anon, authenticated
  using (ranch_id in (select private.visible_ranch_ids()) or ranch_id in (select private.my_ranch_ids()));
create policy "Members manage post categories" on public.post_categories for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read published posts" on public.posts for select to anon, authenticated
  using ((status = 'published' and published_at <= now() and archived_at is null
          and ranch_id in (select private.visible_ranch_ids()))
         or ranch_id in (select private.my_ranch_ids()));
create policy "Members manage posts" on public.posts for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read post photos" on public.post_media for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "Members manage post photos" on public.post_media for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

create policy "Visitors read post animals" on public.post_animals for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id)
         and exists (select 1 from public.animals a where a.id = animal_id));
create policy "Members manage post animals" on public.post_animals for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));

-- ─── FAQs ────────────────────────────────────────────────────────────────────
create policy "Visitors read published FAQs" on public.faqs for select to anon, authenticated
  using ((is_published and ranch_id in (select private.visible_ranch_ids()))
         or ranch_id in (select private.my_ranch_ids()));
create policy "Members manage FAQs" on public.faqs for all to authenticated
  using (ranch_id in (select private.my_ranch_ids()))
  with check (ranch_id in (select private.my_ranch_ids()));
