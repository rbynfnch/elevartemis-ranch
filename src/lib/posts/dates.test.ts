import { describe, expect, it } from "vitest";
import { formatPostDate, groupPostsByYear, postDateAttribute, suggestPostDate } from "./dates";

const TZ = "America/Denver";

describe("formatPostDate", () => {
  it("shows only what the owner knows", () => {
    expect(formatPostDate("2026-09-12T18:00:00Z", "day", TZ)).toBe("September 12, 2026");
    expect(formatPostDate("2019-05-01T18:00:00Z", "month", TZ)).toBe("May 2019");
    expect(formatPostDate("2012-01-01T19:00:00Z", "year", TZ)).toBe("2012");
  });
  it("uses the ranch's time zone: an evening post isn't dated tomorrow", () => {
    // 8:30 pm Mountain on Sept 25 is already Sept 26 in UTC.
    expect(formatPostDate("2026-09-26T02:30:00Z", "day", TZ)).toBe("September 25, 2026");
  });
  it("handles missing dates", () => {
    expect(formatPostDate(null, "day", TZ)).toBeNull();
    expect(formatPostDate("garbage", "day", TZ)).toBeNull();
  });
});

describe("postDateAttribute", () => {
  it("matches the precision", () => {
    expect(postDateAttribute("2019-05-01T18:00:00Z", "month", TZ)).toBe("2019-05");
    expect(postDateAttribute("2026-09-26T02:30:00Z", "day", TZ)).toBe("2026-09-25");
    expect(postDateAttribute("2012-01-01T19:00:00Z", "year", TZ)).toBe("2012");
  });
});

describe("groupPostsByYear", () => {
  it("builds the history newest year first, with no empty years", () => {
    const groups = groupPostsByYear(
      [
        { id: "drive", published_at: "2019-05-01T18:00:00Z" },
        { id: "foals", published_at: "2026-09-12T18:00:00Z" },
        { id: "branding", published_at: "2012-01-01T19:00:00Z" },
        { id: "welcome", published_at: "2026-08-20T18:00:00Z" },
        // New Year's Eve evening in Denver is already January 1 in UTC.
        { id: "nye", published_at: "2020-01-01T05:00:00Z" },
      ],
      TZ,
    );
    expect(groups.map((g) => [g.year, g.posts.map((p) => p.id)])).toEqual([
      [2026, ["foals", "welcome"]],
      [2019, ["nye", "drive"]],
      [2012, ["branding"]],
    ]);
  });
});

describe("suggestPostDate", () => {
  it("suggests a day, month or year from the photos", () => {
    expect(suggestPostDate(["2019-05-03T15:00:00Z", "2019-05-03T20:00:00Z"], TZ)).toEqual({
      date: "2019-05-03T15:00:00Z",
      precision: "day",
    });
    expect(suggestPostDate(["2019-05-09T15:00:00Z", "2019-05-03T15:00:00Z", null], TZ)).toEqual({
      date: "2019-05-03T15:00:00Z",
      precision: "month",
    });
    expect(suggestPostDate(["2019-05-03T15:00:00Z", "2019-10-20T15:00:00Z"], TZ)).toMatchObject({ precision: "year" });
  });
  it("won't guess across years, and handles photos without dates", () => {
    expect(suggestPostDate(["2018-10-01T15:00:00Z", "2020-05-01T15:00:00Z"], TZ)).toEqual({ range: [2018, 2020] });
    expect(suggestPostDate([null, undefined], TZ)).toBeNull();
  });
});
