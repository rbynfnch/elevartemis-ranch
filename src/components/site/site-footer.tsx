import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import type { SiteSettings } from "@/lib/site/get-site";

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

export function SiteFooter({ site }: { site: SiteSettings }) {
  const place = [site.profile.city, site.profile.region].filter(Boolean).join(", ");

  return (
    <footer className="mt-24 bg-night text-on-night">
      <div className="mx-auto grid max-w-[88rem] gap-12 px-[var(--gutter)] py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark name={site.brand.wordmark} subtitle={site.brand.subtitle} mark={site.brand.mark} tone="light" />
          {site.profile.tagline ? (
            <p className="mt-5 max-w-sm font-serif text-lg italic opacity-85">{site.profile.tagline}</p>
          ) : null}
        </div>

        {place || site.profile.publicPhone ? (
          <address className="not-italic">
            <h2 className="font-sans text-sm font-semibold opacity-70">Find us</h2>
            {place ? <p className="mt-3">{place}</p> : null}
            {site.profile.publicPhone ? (
              <p className="mt-1">
                <a href={`tel:${site.profile.publicPhone.replace(/[^\d+]/g, "")}`}>{site.profile.publicPhone}</a>
              </p>
            ) : null}
            <p className="mt-3">
              <Link href="/contact" className="underline decoration-accent underline-offset-4">
                Send us a message
              </Link>
            </p>
          </address>
        ) : (
          <div>
            <h2 className="font-sans text-sm font-semibold opacity-70">Get in touch</h2>
            <p className="mt-3">
              <Link href="/contact" className="underline decoration-accent underline-offset-4">
                Send us a message
              </Link>
            </p>
          </div>
        )}

        {site.social.length > 0 ? (
          <div>
            <h2 className="font-sans text-sm font-semibold opacity-70">Follow along</h2>
            <ul className="mt-3 space-y-1">
              {site.social.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    rel="noopener noreferrer me"
                    target="_blank"
                    className="underline-offset-4 hover:underline"
                  >
                    {s.label ?? platformLabel[s.platform]}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[88rem] px-[var(--gutter)] py-5 text-sm opacity-60">© {site.name}</p>
      </div>
    </footer>
  );
}
