# Blog editor and publishing: architecture

## What the project already is (inspected)

1. **Frontend and routing:** Next.js 16 App Router with Cache Components, React 19, Tailwind 4. One codebase serves every ranch: a proxy rewrites each domain to `/site/<ranch>/…` (public) or `/admin/<ranch>/…` (admin). Public pages are server-rendered and cached per ranch with `use cache` and tags; saves expire the tags, so changes appear in seconds. Search engines and social crawlers get complete HTML and metadata from the server (no client-side rendering is needed).
2. **Backend:** server actions and server components call plain service functions over the signed-in owner's Supabase client, so database rules always apply. A service-role client is used only in a few owner-checked places.
3. **Database:** Supabase Postgres with Row-Level Security, composite foreign keys per ranch and pgTAP tests. Posts live in `posts` (with `post_categories`, `post_media`, `post_animals`).
4. **Authentication:** Supabase Auth, optional two-step sign-in, membership per ranch (owner or editor) checked by `requireAdmin`.
5. **Media:** a Photo Library (`media` table, originals kept in `ranch-originals`, responsive WebP variants in `ranch-media`). Browser uploads are re-encoded before upload, so a crafted file never reaches storage as-is.
6. **Hosting:** Vercel, deploying from the branch. There is no build-per-post: pages are rendered on request and cached, so a publish is live as soon as its cache tag expires. Nothing writes files to the deployed filesystem.
7. **Existing blog:** `/on-the-ranch` (list) and `/on-the-ranch/<slug>` (post), a Tiptap text editor and a simple posts admin (previous work).
8. **Reusable UI:** the admin form controls, `PhotoChooser` / `PhotoPick`, banners and the `RichText` renderer.

## Decisions

- **Content format:** a versioned block document (Tiptap/ProseMirror JSON) in `posts.body` with `posts.content_version`. Blocks: paragraph, headings 2 to 4, lists, quote, pull quote, callout, divider, small text, image (layouts, crop, focal point, link), gallery (grid, masonry, slideshow, side by side), video (YouTube and Vimeo by address), call-to-action button. The editor is a maintained library (Tiptap) with our own blocks on top; no rich-text engine is built from scratch.
- **Safety in two places:** the server rebuilds every saved document from an allowlist (`sanitizeDoc`), so a crafted request cannot store scripts, unknown blocks, bad links or foreign photo ids; the public renderer is also an allowlist, and never prints HTML strings.
- **Drafts and published posts:** edits to a draft save straight to the post; edits to a post that is already live are autosaved to a separate working copy (`draft_data`) and only replace the live version when the owner presses **Update**.
- **Statuses:** draft, scheduled, published, archived; deleted posts go to a trash with restore (`deleted_at`).
- **Scheduling is enforced by the database, not a browser timer:** the public read policy only returns a scheduled post once its time has passed. Cached pages refresh within minutes, and the sitemap and menu count follow the same rule.
- **Previews:** an admin-only preview page rendered by the public site's own layout and styles, with desktop, tablet and phone widths. It needs a signed-in team member, so unpublished content is never exposed.
- **Revisions:** every manual save, publish and update stores a revision; restoring one makes it the current draft.
- **Links that must not break:** changing a published post's web address records the old one and the old address redirects permanently.
- **Images are never altered:** cropping, zoom and focal point are stored beside the photo and applied when it is displayed. The original and the generated sizes are untouched.
