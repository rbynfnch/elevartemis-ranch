import { describe, expect, it } from "vitest";
import { descriptionGuidance, searchPreview, suggestDescription, suggestTitle, titleGuidance } from "./seo";
import { deriveStatus, formatWhen, utcToZonedLocal, zonedLocalToUtc, zoneLabel } from "./schedule";

describe("time zones", () => {
  it("turns a local time into the exact moment, winter and summer", () => {
    expect(zonedLocalToUtc("2026-12-01T09:30", "America/Denver")).toBe("2026-12-01T16:30:00.000Z"); // MST, UTC-7
    expect(zonedLocalToUtc("2026-07-01T09:30", "America/Denver")).toBe("2026-07-01T15:30:00.000Z"); // MDT, UTC-6
  });
  it("round-trips through a zone and handles the daylight saving jump", () => {
    const iso = zonedLocalToUtc("2026-03-08T12:00", "America/Denver")!;
    expect(utcToZonedLocal(iso, "America/Denver")).toBe("2026-03-08T12:00");
    expect(zonedLocalToUtc("2026-03-08T02:30", "America/Denver")).toBeNull(); // clocks skip 2:00 to 3:00
  });
  it("refuses nonsense", () => {
    expect(zonedLocalToUtc("tomorrow", "America/Denver")).toBeNull();
    expect(zonedLocalToUtc("2026-12-01T09:30", "Not/AZone")).toBeNull();
    expect(utcToZonedLocal("nope", "America/Denver")).toBe("");
  });
  it("names the zone and writes dates plainly", () => {
    expect(zoneLabel("America/Denver", new Date("2026-12-01T00:00:00Z"))).toContain("Mountain");
    expect(formatWhen("2026-12-01T16:30:00.000Z", "America/Denver")).toBe("Dec 1 2026 at 9:30 AM");
  });
});

describe("deriveStatus", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  it("tells draft, scheduled, published and archived apart", () => {
    expect(deriveStatus({ status: "draft", published_at: null, archived_at: null }, now)).toBe("draft");
    expect(deriveStatus({ status: "published", published_at: "2026-05-01T00:00:00Z", archived_at: null }, now)).toBe(
      "published",
    );
    expect(deriveStatus({ status: "published", published_at: "2026-07-01T00:00:00Z", archived_at: null }, now)).toBe(
      "scheduled",
    );
    expect(
      deriveStatus(
        { status: "published", published_at: "2026-05-01T00:00:00Z", archived_at: "2026-05-02T00:00:00Z" },
        now,
      ),
    ).toBe("archived");
  });
});

describe("search and sharing guidance", () => {
  it("suggests from the title, summary or story", () => {
    expect(suggestTitle("x".repeat(100)).length).toBeLessThanOrEqual(60);
    expect(suggestDescription("A short summary.", "Long story text")).toBe("A short summary.");
    expect(suggestDescription("", "Opening words of the story.")).toBe("Opening words of the story.");
    expect(suggestDescription("", "word ".repeat(100)).length).toBeLessThanOrEqual(160);
  });
  it("guides length in plain words", () => {
    expect(titleGuidance("", "").tone).toBe("warn");
    expect(titleGuidance("x".repeat(70), "t").text).toMatch(/cut it off/);
    expect(descriptionGuidance("", "").text).toMatch(/Add a short description/);
    expect(descriptionGuidance("short", "x").text).toMatch(/little short/);
    expect(descriptionGuidance("y".repeat(120), "").tone).toBe("good");
  });
  it("lays out a search result", () => {
    expect(
      searchPreview({
        host: "flyingw.com",
        path: "/on-the-ranch/branding-day",
        title: "Branding Day",
        description: "A busy day.",
      }),
    ).toEqual({ title: "Branding Day", url: "flyingw.com › on-the-ranch › branding-day", description: "A busy day." });
  });
});
