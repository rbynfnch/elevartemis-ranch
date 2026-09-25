/**
 * Cache tags for public content, keyed by ranch slug.
 * Public reads tag themselves; admin Server Actions expire the matching tags
 * after a save so the public site updates within seconds.
 */
export const cacheTags = {
  /** Everything for a ranch. Expire on settings/branding changes. */
  ranch: (slug: string) => `ranch:${slug}`,
  site: (slug: string) => `ranch:${slug}:site`,
  animals: (slug: string) => `ranch:${slug}:animals`,
  slides: (slug: string) => `ranch:${slug}:slides`,
  posts: (slug: string) => `ranch:${slug}:posts`,
  faqs: (slug: string) => `ranch:${slug}:faqs`,
  pages: (slug: string) => `ranch:${slug}:pages`,
  gallery: (slug: string) => `ranch:${slug}:gallery`,
} as const;
