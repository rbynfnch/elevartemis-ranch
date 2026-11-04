-- Optional: three DRAFT demo posts to try the blog editor with (Ranch Life, Our Horses, Our Cattle).
-- Run in the Supabase SQL editor. They are drafts marked as demo content, with [bracketed] placeholder text only:
-- nothing here is a real ranch fact. Delete them from "Happening on the Ranch" (Trash) when you're done.
do $$
declare r uuid; c record;
begin
  select id into r from public.ranches where slug = 'flying-w-ranch';
  if r is null then raise exception 'Ranch not found'; end if;
  for c in select * from (values
    ('ranch-life', '[Demo] A day in ranch life', '[Placeholder: a short story about an ordinary day on the ranch.]'),
    ('our-horses', '[Demo] News from the horse barn', '[Placeholder: an update about the horses.]'),
    ('our-cattle', '[Demo] News from the cattle pasture', '[Placeholder: an update about the cattle.]')
  ) as t(cat, title, body) loop
    insert into public.posts (ranch_id, title, slug, status, is_demo, category_id, excerpt, body, content_version)
    values (r, c.title, '', 'draft', true,
            (select id from public.post_categories where ranch_id = r and slug = c.cat),
            c.body,
            jsonb_build_object('type','doc','content', jsonb_build_array(
              jsonb_build_object('type','heading','attrs',jsonb_build_object('level',2),'content',jsonb_build_array(jsonb_build_object('type','text','text',c.title))),
              jsonb_build_object('type','paragraph','content',jsonb_build_array(jsonb_build_object('type','text','text',c.body))),
              jsonb_build_object('type','callout','attrs',jsonb_build_object('tone','tip'),'content',jsonb_build_array(jsonb_build_object('type','paragraph','content',jsonb_build_array(jsonb_build_object('type','text','text','[Placeholder tip.]'))))))),
            2);
  end loop;
end $$;
