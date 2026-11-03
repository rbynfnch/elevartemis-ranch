-- =============================================================================
-- Flying W Ranch: first-client settings for HOSTED projects (staging, later
-- production). Run in the Supabase SQL editor AFTER scripts/provision-ranch.ts
-- has created the ranch. Safe to re-run. NOT a migration and NOT seed data.
-- Facts here are client-confirmed only (see docs/handoff).
-- =============================================================================

-- Horses: heading "Quarter Horses & Appaloosas", all platform categories.
insert into public.ranch_species_settings (ranch_id, species, breed_heading)
select id, 'horse', 'Quarter Horses & Appaloosas' from public.ranches where slug = 'flying-w-ranch'
on conflict (ranch_id, species) do update set breed_heading = excluded.breed_heading;

-- Cattle: Herefords -> Bulls, Yearlings, Cows, For Sale. Sold page is off
-- pending client confirmation; Retired and Reference are off.
insert into public.ranch_species_settings
  (ranch_id, species, breed_heading, categories, show_sold, show_retired, show_reference, show_for_sale)
select id, 'cattle', 'Herefords', '{cattle.bull,cattle.yearling,cattle.cow}', false, false, false, true
from public.ranches where slug = 'flying-w-ranch'
on conflict (ranch_id, species) do update set
  breed_heading = excluded.breed_heading, categories = excluded.categories,
  show_sold = excluded.show_sold, show_retired = excluded.show_retired,
  show_reference = excluded.show_reference, show_for_sale = excluded.show_for_sale;

-- Tagline and time zone.
update public.ranch_profile
set tagline = 'Raising and breeding registered Quarter Horses, Appaloosas and Hereford cattle.',
    time_zone = 'America/Denver'
where ranch_id = (select id from public.ranches where slug = 'flying-w-ranch');

-- Check: expect 2 settings rows and the tagline.
select s.species, s.breed_heading, s.categories, s.show_sold, p.tagline, p.time_zone
from public.ranches r
join public.ranch_species_settings s on s.ranch_id = r.id
join public.ranch_profile p on p.ranch_id = r.id
where r.slug = 'flying-w-ranch';
