/** Suggestions and plain-language guidance for how a post looks in search results and when shared. */
export const TITLE_BEST = 60;
export const DESCRIPTION_BEST = { min: 70, max: 160 } as const;

const clip = (s: string, n: number) =>
  s.length <= n
    ? s
    : `${s
        .slice(0, n - 1)
        .replace(/\s+\S*$/, "")
        .trimEnd()}…`;

export const suggestTitle = (title: string) => clip(title.trim(), TITLE_BEST);

/** From the summary if there is one, otherwise the opening words of the story. */
export function suggestDescription(excerpt: string, bodyText: string): string {
  const base = (excerpt.trim() || bodyText.trim()).replace(/\s+/g, " ");
  return clip(base, DESCRIPTION_BEST.max);
}

export type Guidance = { tone: "good" | "warn" | "info"; text: string };

export function titleGuidance(seoTitle: string, fallbackTitle: string): Guidance {
  const t = (seoTitle || fallbackTitle).trim();
  if (!t) return { tone: "warn", text: "Add a title so search engines have something to show." };
  if (!seoTitle.trim())
    return { tone: "info", text: `Search results will use the post's title (${t.length} characters).` };
  if (t.length > TITLE_BEST)
    return { tone: "warn", text: `${t.length} characters. Search results may cut it off after ${TITLE_BEST}.` };
  if (t.length < 20)
    return { tone: "warn", text: `${t.length} characters. A little short: say a bit more about the story.` };
  return { tone: "good", text: `${t.length} characters. Good.` };
}

export function descriptionGuidance(description: string, fallback: string): Guidance {
  const d = description.trim();
  if (!d)
    return fallback.trim()
      ? { tone: "info", text: "Search results will use the summary or the opening of the story." }
      : { tone: "warn", text: "Add a short description. Without one, search engines pick words from the page." };
  if (d.length < DESCRIPTION_BEST.min)
    return {
      tone: "warn",
      text: `${d.length} characters. A little short: aim for ${DESCRIPTION_BEST.min} to ${DESCRIPTION_BEST.max}.`,
    };
  if (d.length > DESCRIPTION_BEST.max)
    return {
      tone: "warn",
      text: `${d.length} characters. Search results may cut it off after ${DESCRIPTION_BEST.max}.`,
    };
  return { tone: "good", text: `${d.length} characters. Good.` };
}

/** How the address reads in a search result: ranch.com › on-the-ranch › the-slug */
export function searchPreview(input: { host: string; path: string; title: string; description: string }) {
  const crumbs = input.path.split("/").filter(Boolean);
  return {
    title: clip(input.title.trim() || "Untitled post", 70),
    url: [input.host, ...crumbs].join(" › "),
    description: clip(input.description.trim(), 170),
  };
}

export const slugChangeWarning = (wasLive: boolean, changed: boolean) =>
  wasLive && changed
    ? "This post is live. Changing its web address is safe: the old address will send visitors to the new one. Links people shared will keep working."
    : null;
