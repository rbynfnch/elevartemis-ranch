-- The for-sale page's cards show the headline, height and registration, and visitors can search them.
-- Columns are appended to public_animal_cards (existing ones keep their places).
create or replace view public.public_animal_cards with (security_invoker = true) as
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
  a.updated_at,
  (a.program_status = 'deceased')                                     as on_memorial_page,
  a.deceased_on, a.deceased_precision,
  case when a.breeding_available then coalesce(b.status, 'available') end as breeding_status,
  a.tagline, a.height, a.registry, a.registration_number
from public.animals a
join public.animal_categories c on c.id = a.category_id
left join public.sale_listings s on s.animal_id = a.id
left join public.breeding_services b on b.animal_id = a.id
left join public.media m on m.id = a.primary_media_id and m.status = 'ready'
where a.record_scope = 'inventory'
  and a.is_published
  and a.archived_at is null
  and a.ranch_id in (select private.visible_ranch_ids());
