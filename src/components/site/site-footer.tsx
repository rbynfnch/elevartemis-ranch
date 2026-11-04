import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { SocialIcon, hasSocialIcon } from "@/components/site/social-icon";
import type { SiteSettings } from "@/lib/site/get-site";
import type { NavItem } from "@/lib/site/navigation";

const platformLabel: Record<SiteSettings["social"][number]["platform"], string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  other: "Link",
};

export function SiteFooter({ site, items }: { site: SiteSettings; items: NavItem[] }) {
  const place = [site.profile.city, site.profile.region].filter(Boolean).join(", ");
  const links = items.filter((i) => i.href !== "/");

  return (
    <footer className="bg-night text-on-night">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-8 px-[var(--gutter)] py-10 lg:flex-row lg:items-center lg:justify-between">
        <Wordmark name={site.brand.wordmark} subtitle={site.brand.subtitle} mark={site.brand.mark} tone="light" caps />

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-7 gap-y-1 text-[0.6875rem] font-medium uppercase tracking-[0.18em]">
            {links.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center no-underline opacity-80 hover:opacity-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {site.social.length > 0 ? (
          <ul className="flex items-center gap-1">
            {site.social.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  rel="noopener noreferrer me"
                  target="_blank"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-sm opacity-80 hover:opacity-100"
                >
                  <SocialIcon platform={s.platform} />
                  <span className={hasSocialIcon(s.platform) ? "sr-only" : ""}>
                    {s.label ?? platformLabel[s.platform]}
                  </span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-2 px-[var(--gutter)] py-5 text-sm opacity-70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {site.name}</p>
          {site.profile.tagline ? <p className="font-serif italic">{site.profile.tagline}</p> : null}
          {place || site.profile.publicPhone ? (
            <p>
              {place}
              {place && site.profile.publicPhone ? " · " : null}
              {site.profile.publicPhone ? (
                <a href={`tel:${site.profile.publicPhone.replace(/[^\d+]/g, "")}`}>{site.profile.publicPhone}</a>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
