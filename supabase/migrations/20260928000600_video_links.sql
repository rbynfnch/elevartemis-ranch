-- =============================================================================
-- Video links on an animal's page may point to YouTube, Vimeo, TikTok,
-- Instagram or Facebook (they open in a new tab; nothing is embedded). Only
-- https addresses on those sites are accepted.
-- =============================================================================

alter table public.animal_videos drop constraint if exists animal_videos_url_check;

alter table public.animal_videos add constraint animal_videos_url_check check (
  url ~* '^https://([a-z0-9-]+\.)*(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|instagram\.com|facebook\.com|fb\.watch)(/[^\s]*)?$'
);
