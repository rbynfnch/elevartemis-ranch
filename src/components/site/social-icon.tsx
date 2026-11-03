import type { SiteSettings } from "@/lib/site/get-site";

type Platform = SiteSettings["social"][number]["platform"];

const paths: Partial<Record<Platform, React.ReactNode>> = {
  facebook: (
    <path
      d="M14 8.5V7c0-.8.3-1.200 1.300-1.200H17V3h-2.600C11.700 3 10.500 4.600 10.500 6.800V8.500H8V11.500h2.500V21H14v-9.500h2.600l.4-3z"
      fill="currentColor"
      stroke="none"
    />
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.500" />
      <circle cx="12" cy="12" r="3.600" />
      <circle cx="16.800" cy="7.200" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3.500" />
      <path d="m10.500 9.500 4 2.500-4 2.500z" fill="currentColor" stroke="none" />
    </>
  ),
};

export function hasSocialIcon(platform: Platform): boolean {
  return platform in paths;
}

/** Small outline icon for a social platform, or null when we only have a text label for it. */
export function SocialIcon({ platform }: { platform: Platform }) {
  const body = paths[platform];
  if (!body) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}
