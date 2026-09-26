/**
 * Dates for "Happening on the Ranch" posts.
 *
 * Posts may be back-dated to build the ranch's history, often from old photos
 * where only the month or year is known. Dates are always read in the ranch's
 * time zone so an evening post never shows as the next day, and "May 2019"
 * never becomes April 30.
 */
export type DatePrecision = "year" | "month" | "day";

function parts(iso: string, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "long", day: "numeric" });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(iso))) out[p.type] = p.value;
  return { year: Number(out.year), month: out.month, day: Number(out.day) };
}

/** "September 12, 2026" · "May 2019" · "2012" */
export function formatPostDate(
  iso: string | null | undefined,
  precision: DatePrecision,
  timeZone: string,
): string | null {
  if (!iso || Number.isNaN(Date.parse(iso))) return null;
  const { year, month, day } = parts(iso, timeZone);
  if (precision === "year") return String(year);
  if (precision === "month") return `${month} ${year}`;
  return `${month} ${day}, ${year}`;
}

/** Machine-readable date for <time dateTime> and structured data, at the right precision. */
export function postDateAttribute(iso: string, precision: DatePrecision, timeZone: string): string {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
  return precision === "year" ? d.slice(0, 4) : precision === "month" ? d.slice(0, 7) : d;
}

export function postYear(iso: string, timeZone: string): number {
  return parts(iso, timeZone).year;
}

/** Newest year first; posts within a year newest first. Years with no posts don't exist. */
export function groupPostsByYear<T extends { published_at: string }>(
  posts: T[],
  timeZone: string,
): { year: number; posts: T[] }[] {
  const sorted = [...posts].sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  const groups: { year: number; posts: T[] }[] = [];
  for (const post of sorted) {
    const year = postYear(post.published_at, timeZone);
    const last = groups.at(-1);
    if (last?.year === year) last.posts.push(post);
    else groups.push({ year, posts: [post] });
  }
  return groups;
}

/**
 * Suggests a post date from the photos' "taken on" dates (EXIF), so an owner
 * adding a folder of old cattle-drive photos doesn't have to work it out:
 *   all on one day     → that day
 *   within one month   → that month
 *   within one year    → that year
 *   across years       → no suggestion (the owner picks), with the range to show
 */
export function suggestPostDate(
  takenAt: (string | null | undefined)[],
  timeZone: string,
): { date: string; precision: DatePrecision } | { range: [number, number] } | null {
  const dates = takenAt.filter((d): d is string => !!d && !Number.isNaN(Date.parse(d))).sort();
  if (dates.length === 0) return null;
  const first = parts(dates[0], timeZone);
  const last = parts(dates[dates.length - 1], timeZone);
  if (first.year !== last.year) return { range: [first.year, last.year] };
  const precision: DatePrecision = first.month !== last.month ? "year" : first.day !== last.day ? "month" : "day";
  return { date: dates[0], precision };
}
