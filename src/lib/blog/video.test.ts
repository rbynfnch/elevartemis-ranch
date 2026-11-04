import { describe, expect, it } from "vitest";
import { aspectRatio, cropStyles, isUncropped } from "./crop";
import { embedSrc, parseVideoEmbed } from "./video";

describe("parseVideoEmbed", () => {
  it("reads the usual YouTube addresses", () => {
    for (const u of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s",
      "https://youtu.be/dQw4w9WgXcQ?si=x",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ])
      expect(parseVideoEmbed(u)).toMatchObject({ provider: "youtube", videoId: "dQw4w9WgXcQ" });
  });
  it("reads Vimeo addresses", () => {
    expect(parseVideoEmbed("https://vimeo.com/123456789")).toMatchObject({ provider: "vimeo", videoId: "123456789" });
    expect(parseVideoEmbed("https://player.vimeo.com/video/123456789?h=abc")).toMatchObject({
      provider: "vimeo",
      videoId: "123456789",
    });
    expect(parseVideoEmbed("https://vimeo.com/channels/staffpicks/123456789")?.videoId).toBe("123456789");
  });
  it("refuses everything else", () => {
    for (const u of [
      "",
      "nope",
      "javascript:alert(1)",
      "https://evil.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=short",
      "https://tiktok.com/@a/video/1",
    ])
      expect(parseVideoEmbed(u)).toBeNull();
  });
  it("builds privacy-friendly players", () => {
    expect(embedSrc("youtube", "dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(embedSrc("vimeo", "123456789")).toContain("player.vimeo.com/video/123456789");
  });
});

describe("cropStyles", () => {
  it("leaves an uncropped photo alone", () => {
    expect(cropStyles({ aspect: "original", zoom: 1, focalX: 0.5, focalY: 0.5 })).toEqual({ frame: {}, img: {} });
    expect(isUncropped({ aspect: "original", zoom: 1, focalX: 0.5, focalY: 0.5 })).toBe(true);
  });
  it("frames, positions and zooms without altering the file", () => {
    const s = cropStyles({ aspect: "16:9", zoom: 1.5, focalX: 0.25, focalY: 0.75 });
    expect(s.frame).toEqual({ aspectRatio: "16 / 9", overflow: "hidden" });
    expect(s.img).toEqual({
      objectFit: "cover",
      objectPosition: "25% 75%",
      transform: "scale(1.50)",
      transformOrigin: "25% 75%",
    });
    expect(aspectRatio("4:5")).toBe("4 / 5");
  });
});
