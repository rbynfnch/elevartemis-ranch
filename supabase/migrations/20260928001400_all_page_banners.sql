-- Every public page can have a banner: In Memory, and the Sold, Retired and Previous Stallions /
-- Reference Sires pages for each species, besides the pages already allowed.
alter table public.page_banners drop constraint if exists page_banners_page_key_check;
alter table public.page_banners add constraint page_banners_page_key_check check (
  page_key in ('about', 'for-sale', 'horses', 'cattle', 'contact', 'in-memory')
  or page_key ~ '^(sold|retired|reference)-(horses|cattle)$'
  or page_key ~ '^category:(horse|cattle)\.[a-z0-9_]+$'
);
