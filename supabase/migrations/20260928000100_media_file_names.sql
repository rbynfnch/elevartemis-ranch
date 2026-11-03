-- =============================================================================
-- Photo Library: every photo keeps the file name it was uploaded with, so the
-- owner can find it in the library and refer to it from a spreadsheet (CSV).
--
-- Unique per ranch, ignoring capitals ("Stallion1.JPG" and "stallion1.jpg" are
-- the same name). Photos uploaded before this change have no name; the library
-- shows them as untitled and lets the owner name them.
-- =============================================================================

alter table public.media
  add column file_name text check (file_name is null or length(btrim(file_name)) between 1 and 200);

create unique index media_file_name_per_ranch
  on public.media (ranch_id, lower(file_name))
  where file_name is not null;
