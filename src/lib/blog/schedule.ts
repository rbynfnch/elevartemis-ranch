/** Date and time in the ranch's own time zone. The database stores the exact moment; people see and choose local time. */

const parts = (ms: number, tz: string) => {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(ms))) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o;
};

/** "2026-12-01T09:30" as written in `tz` becomes the exact moment it means, as an ISO string. Null when it isn't a real time. */
export function zonedLocalToUtc(local: string, tz: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  try {
    // Start from the wall time read as UTC, then correct by how far the zone is from UTC at that moment (twice, for daylight saving).
    let guess = wanted;
    for (let i = 0; i < 3; i++) {
      const p = parts(guess, tz);
      const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
      guess += wanted - shown;
    }
    const p = parts(guess, tz);
    if (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) !== wanted) return null; // a time that doesn't exist (clocks skipping ahead)
    return new Date(guess).toISOString();
  } catch {
    return null;
  }
}

/** The moment `iso` as "YYYY-MM-DDTHH:mm" in `tz`, for a date and time box. */
export function utcToZonedLocal(iso: string, tz: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  try {
    const p = parts(ms, tz);
    const two = (n: number) => String(n).padStart(2, "0");
    return `${p.year}-${two(p.month)}-${two(p.day)}T${two(p.hour)}:${two(p.minute)}`;
  } catch {
    return "";
  }
}

/** "Mountain Time (America/Denver)" for showing next to a time. */
export function zoneLabel(tz: string, at: Date = new Date()): string {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "long" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value;
    return name ? `${name} (${tz})` : tz;
  } catch {
    return tz;
  }
}

/** A friendly date and time, in the ranch's zone: "Dec 1, 2026 at 9:30 AM". */
export function formatWhen(iso: string, tz: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    const date = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" })
      .format(d)
      .replace(",", "");
    const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
    return `${date} at ${time}`;
  } catch {
    return iso;
  }
}

export type PostStatus = "draft" | "scheduled" | "published" | "archived";

/** What a post is, from what is stored: archived, a draft, scheduled for later, or live. */
export function deriveStatus(
  row: { status: "draft" | "published"; published_at: string | null; archived_at: string | null },
  now: Date = new Date(),
): PostStatus {
  if (row.archived_at) return "archived";
  if (row.status === "draft") return "draft";
  return row.published_at && Date.parse(row.published_at) > now.getTime() ? "scheduled" : "published";
}
