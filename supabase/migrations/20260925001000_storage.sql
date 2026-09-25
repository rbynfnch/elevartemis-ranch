-- =============================================================================
-- Storage buckets
--   ranch-originals  private · uploads as received (after browser downscale)
--   ranch-media      public  · optimized WebP derivatives served from the CDN
-- Every object path starts with the ranch id:  {ranch_id}/{media_id}/…
-- Members may write only under their own ranch's folder.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ranch-originals', 'ranch-originals', false, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('ranch-media', 'ranch-media', true, 20971520,
   array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create function private.my_ranch_folders()
returns setof text language sql stable security definer
set search_path = ''
as $$
  select id::text from private.my_ranch_ids() as id;
$$;
revoke all on function private.my_ranch_folders() from public;
grant execute on function private.my_ranch_folders() to authenticated, service_role;

-- Select is also needed for upserts/replacements in the public bucket.
create policy "Members read their ranch files"
  on storage.objects for select to authenticated
  using (bucket_id in ('ranch-originals', 'ranch-media')
         and (storage.foldername(name))[1] in (select private.my_ranch_folders()));

create policy "Members upload to their ranch folders"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('ranch-originals', 'ranch-media')
              and (storage.foldername(name))[1] in (select private.my_ranch_folders()));

create policy "Members update their ranch files"
  on storage.objects for update to authenticated
  using (bucket_id in ('ranch-originals', 'ranch-media')
         and (storage.foldername(name))[1] in (select private.my_ranch_folders()))
  with check (bucket_id in ('ranch-originals', 'ranch-media')
              and (storage.foldername(name))[1] in (select private.my_ranch_folders()));

create policy "Members delete their ranch files"
  on storage.objects for delete to authenticated
  using (bucket_id in ('ranch-originals', 'ranch-media')
         and (storage.foldername(name))[1] in (select private.my_ranch_folders()));
