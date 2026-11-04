import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "./video";

describe("parseVideoUrl", () => {
  it("accepts links from the supported sites and names the site", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=abc")).toMatchObject({ ok: true, platform: "YouTube" });
    expect(parseVideoUrl("https://youtu.be/abc")).toMatchObject({ ok: true, platform: "YouTube" });
    expect(parseVideoUrl("https://vimeo.com/123")).toMatchObject({ ok: true, platform: "Vimeo" });
    expect(parseVideoUrl("https://www.tiktok.com/@ranch/video/1")).toMatchObject({ ok: true, platform: "TikTok" });
    expect(parseVideoUrl("https://vm.tiktok.com/abc/")).toMatchObject({ ok: true, platform: "TikTok" });
    expect(parseVideoUrl("https://www.instagram.com/reel/abc/")).toMatchObject({ ok: true, platform: "Instagram" });
    expect(parseVideoUrl("https://fb.watch/abc/")).toMatchObject({ ok: true, platform: "Facebook" });
  });
  it("refuses other sites, look-alikes, and anything that isn't https", () => {
    expect(parseVideoUrl("https://example.com/video").ok).toBe(false);
    expect(parseVideoUrl("https://youtube.com.evil.example/x").ok).toBe(false);
    expect(parseVideoUrl("https://evil.example/youtube.com/x").ok).toBe(false);
    expect(parseVideoUrl("http://www.youtube.com/watch?v=abc").ok).toBe(false);
    expect(parseVideoUrl("javascript:alert(1)").ok).toBe(false);
    expect(parseVideoUrl("not a link").ok).toBe(false);
  });
});
