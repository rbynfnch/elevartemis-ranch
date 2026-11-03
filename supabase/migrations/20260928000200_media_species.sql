-- =============================================================================
-- Photo Library: a photo can be filed under a species (horse, cattle, and any
-- added later) before it is put on an animal. Optional; photos on animals are
-- also sorted by their animals' species, so this only matters for photos that
-- aren't on an animal yet or that the owner wants filed differently.
-- =============================================================================

alter table public.media add column species public.species;

comment on column public.media.species is
  'Optional library category chosen by the owner. Animals using the photo also place it under their own species.';
