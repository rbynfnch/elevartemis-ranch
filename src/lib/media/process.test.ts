import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processImage } from "./process";

async function jpeg(width: number, height: number, withExif = false) {
  let img = sharp({ create: { width, height, channels: 3, background: { r: 120, g: 90, b: 60 } } }).jpeg();
  if (withExif) {
    img = img
      .withExif({ IFD0: { Make: "RanchCam" }, IFD2: { DateTimeOriginal: "2019:05:03 09:15:00" } })
      .withMetadata({ orientation: 6 });
  }
  return img.toBuffer();
}

describe("processImage", () => {
  it("makes every size up to the original, never upscaling", async () => {
    const out = await processImage(await jpeg(3000, 2000));
    expect(out.variants.map((v) => v.width)).toEqual([320, 640, 960, 1280, 1920, 2560]);
    expect(out.variants.at(-1)?.height).toBe(1707);
    expect(out.width).toBe(3000);
  });

  it("keeps small photos at their own size", async () => {
    const out = await processImage(await jpeg(500, 400));
    expect(out.variants.map((v) => v.width)).toEqual([320, 500]);
  });

  it("outputs WebP with a tiny blurred placeholder", async () => {
    const out = await processImage(await jpeg(800, 600));
    const meta = await sharp(out.variants[0].data).metadata();
    expect(meta.format).toBe("webp");
    expect(out.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
    expect(out.blurDataUrl.length).toBeLessThan(1500);
  });

  it("corrects phone orientation, reads when it was taken, and strips metadata", async () => {
    const out = await processImage(await jpeg(1200, 800, true));
    // Orientation 6 = rotated 90°: portrait after correction.
    expect([out.width, out.height]).toEqual([800, 1200]);
    expect(out.takenAt?.startsWith("2019-05-03")).toBe(true);
    const published = await sharp(out.variants[0].data).metadata();
    expect(published.exif).toBeUndefined();
    expect(published.orientation).toBeUndefined();
  });

  it("rejects files that aren't photos", async () => {
    await expect(processImage(Buffer.from("not an image"))).rejects.toThrow();
  });
});
