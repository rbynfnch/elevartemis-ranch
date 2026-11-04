-- A ranch that narrowed its cattle categories (for example Bulls, Yearlings, Cows) could not use the
-- categories added since, or Heifer, Steer and Calf. Add them to those lists, after the ones already
-- chosen, so the Category choice on the animal form and the CSV import offer them. A ranch with no
-- narrowed list already offers every category and is untouched. The menu still shows only categories
-- that have animals on the public site, so nothing new appears until it is used.
update public.ranch_species_settings s
set categories = s.categories || array(
  select c.id
  from public.animal_categories c
  where c.species = 'cattle'
    and c.id in ('cattle.heifer', 'cattle.steer', 'cattle.calf', 'cattle.lot')
    and not (c.id = any (s.categories))
  order by c.sort_order
)
where s.species = 'cattle' and s.categories is not null;
