-- The Sold Horses and Sold Cattle pages get banners too.
alter table public.page_banners drop constraint if exists page_banners_page_key_check;
alter table public.page_banners add constraint page_banners_page_key_check check (
  page_key in ('about', 'for-sale', 'horses', 'cattle', 'contact', 'sold-horses', 'sold-cattle')
  or page_key ~ '^category:(horse|cattle)\.[a-z0-9_]+$'
);
