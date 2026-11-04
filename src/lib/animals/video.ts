/**
 * A video link on an animal's page. It opens in a new tab, so any of these
 * sites works and nothing is embedded. Only https addresses on a known site are
 * accepted (the database enforces the same list).
 */
const SITES: [RegExp, string][] = [
  [/(^|\.)(youtube\.com|youtu\.be)$/i, "YouTube"],
  [/(^|\.)vimeo\.com$/i, "Vimeo"],
  [/(^|\.)tiktok\.com$/i, "TikTok"],
  [/(^|\.)instagram\.com$/i, "Instagram"],
  [/(^|\.)(facebook\.com|fb\.watch)$/i, "Facebook"],
];

export type VideoLink = { ok: true; url: string; platform: string } | { ok: false; message: string };

export function parseVideoUrl(raw: string): VideoLink {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, message: "Paste the full link, starting with https://" };
  }
  if (url.protocol !== "https:") return { ok: false, message: "Use a link that starts with https://" };
  const site = SITES.find(([host]) => host.test(url.hostname));
  if (!site) return { ok: false, message: "Use a link from YouTube, Vimeo, TikTok, Instagram or Facebook." };
  if (url.href.length > 500) return { ok: false, message: "That link is too long." };
  return { ok: true, url: url.href, platform: site[1] };
}
