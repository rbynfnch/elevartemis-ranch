-- =============================================================================
-- Atomic admin operations. SECURITY INVOKER: they run as the signed-in owner,
-- so every RLS policy (including two-step verification) still applies.
-- =============================================================================

-- Replace an animal's Quick Facts and story sections in one transaction.
-- p_facts:    [{ "label": "Height", "value": "15.1 hh" }, …]
-- p_sections: [{ "heading": "Breeding notes", "body": <rich text> }, …]
create function public.replace_animal_details(p_animal uuid, p_facts jsonb, p_sections jsonb)
returns void language plpgsql security invoker
set search_path = ''
as $$
declare
  r uuid;
begin
  select a.ranch_id into r from public.animals a where a.id = p_animal;
  if r is null then
    raise exception 'That animal could not be found.' using errcode = 'RA016';
  end if;
  delete from public.animal_facts f where f.animal_id = p_animal;
  delete from public.animal_sections s where s.animal_id = p_animal;
  insert into public.animal_facts (ranch_id, animal_id, label, value, sort_order)
    select r, p_animal, e ->> 'label', e ->> 'value', i::int
    from jsonb_array_elements(coalesce(p_facts, '[]')) with ordinality as t(e, i);
  insert into public.animal_sections (ranch_id, animal_id, heading, body, sort_order)
    select r, p_animal, e ->> 'heading', e -> 'body', i::int
    from jsonb_array_elements(coalesce(p_sections, '[]')) with ordinality as t(e, i);
end $$;

-- Save a new photo order: p_media lists the animal's photo ids, first to last.
create function public.reorder_animal_photos(p_animal uuid, p_media uuid[])
returns void language plpgsql security invoker
set search_path = ''
as $$
begin
  update public.animal_media m
     set sort_order = o.i
    from unnest(p_media) with ordinality as o(media_id, i)
   where m.animal_id = p_animal and m.media_id = o.media_id;
end $$;

revoke all on function public.replace_animal_details(uuid, jsonb, jsonb), public.reorder_animal_photos(uuid, uuid[]) from public, anon;
grant execute on function public.replace_animal_details(uuid, jsonb, jsonb), public.reorder_animal_photos(uuid, uuid[]) to authenticated;
