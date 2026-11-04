/** Rules for the Ranch Info form: tidy text and links. Pure, so it is easy to test. */
export const PLATFORMS = ["facebook", "instagram", "youtube", "tiktok", "x", "linkedin", "pinterest", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const platformLabels: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  other: "Another website",
};

export type SocialInput = { platform: Platform; url: string; label: string };

export type RanchInfoInput = {
  tagline: string;
  intro: unknown;
  publicPhone: string;
  city: string;
  region: string;
  addressDisplay: string;
  hoursText: string;
  blogLabel: string;
  social: SocialInput[];
};

const squash = (v: string, max: number) => v.replace(/\s+/g, " ").trim().slice(0, max);

/** A link must be https and have a real-looking address. Returns the tidy link or null. */
export function tidyUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    // Stored links are https only: a plain http address is upgraded.
    u.protocol = "https:";
    const text = u.toString();
    return text.length <= 500 ? text : null;
  } catch {
    return null;
  }
}

export type TidyInfo = {
  profile: {
    tagline: string | null;
    public_phone: string | null;
    city: string | null;
    region: string | null;
    address_display: string | null;
    hours_text: string | null;
  };
  blogLabel: string | null;
  social: { platform: Platform; url: string; label: string | null; sort_order: number }[];
};

export function tidyInfo(input: RanchInfoInput): { ok: true; info: TidyInfo } | { ok: false; message: string } {
  const phone = squash(input.publicPhone, 40);
  if (phone && (phone.length < 7 || !/\d{3}/.test(phone)))
    return { ok: false, message: "Enter a phone number with the area code, like (555) 555-0123." };
  const social: TidyInfo["social"] = [];
  const seen = new Set<string>();
  for (const [i, row] of input.social.entries()) {
    if (!row.url.trim()) continue;
    const url = tidyUrl(row.url);
    if (!url)
      return {
        ok: false,
        message: `The ${platformLabels[row.platform]} link isn't a web address. Paste the full link.`,
      };
    const label = squash(row.label, 60);
    if (row.platform === "other" && !label)
      return { ok: false, message: "Give the other website a short name, like “Our herd on AQHA”." };
    if (row.platform !== "other" && seen.has(row.platform))
      return { ok: false, message: `You can only list ${platformLabels[row.platform]} once.` };
    seen.add(row.platform);
    social.push({ platform: row.platform, url, label: row.platform === "other" ? label : null, sort_order: i });
  }
  return {
    ok: true,
    info: {
      profile: {
        tagline: squash(input.tagline, 200) || null,
        public_phone: phone || null,
        city: squash(input.city, 80) || null,
        region: squash(input.region, 80) || null,
        address_display: squash(input.addressDisplay, 200) || null,
        hours_text: squash(input.hoursText, 200) || null,
      },
      blogLabel: squash(input.blogLabel, 60) || null,
      social,
    },
  };
}
