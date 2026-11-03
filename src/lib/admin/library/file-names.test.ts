import { describe, expect, it } from "vitest";
import { checkFileName, cleanFileName, extensionFor, splitFileName, uniqueFileName } from "./file-names";

describe("cleanFileName", () => {
  it("drops folders and stray characters", () => {
    expect(cleanFileName("C:\\Users\\me\\Stallion 1.JPG")).toBe("Stallion 1.JPG");
    expect(cleanFileName("  photos/mare.png ")).toBe("mare.png");
    expect(cleanFileName("")).toBe("");
  });
});

describe("uniqueFileName", () => {
  it("keeps a free name as it is", () => {
    expect(uniqueFileName("mare.jpg", [])).toBe("mare.jpg");
  });
  it("numbers a name the ranch already has, ignoring capitals", () => {
    expect(uniqueFileName("Mare.JPG", ["mare.jpg"])).toBe("Mare-2.JPG");
    expect(uniqueFileName("mare.jpg", ["mare.jpg", "mare-2.jpg"])).toBe("mare-3.jpg");
  });
  it("never produces an empty name", () => {
    expect(uniqueFileName("", [])).toBe("photo.jpg");
  });
  it("stays within 200 characters", () => {
    const long = `${"a".repeat(300)}.jpg`;
    expect(uniqueFileName(long, []).length).toBeLessThanOrEqual(200);
    expect(uniqueFileName(long, [cleanFileName(long)]).length).toBeLessThanOrEqual(200);
  });
});

describe("splitFileName / extensionFor", () => {
  it("splits off a real image extension only", () => {
    expect(splitFileName("Stallion 1.JPG")).toEqual({ base: "Stallion 1", ext: ".JPG" });
    expect(splitFileName("Mare v1.25")).toEqual({ base: "Mare v1.25", ext: "" });
  });
  it("keeps the photo's own extension, else uses its file type, else .jpg", () => {
    expect(extensionFor("mare.PNG", "image/jpeg")).toBe(".PNG");
    expect(extensionFor("Untitled", "image/png")).toBe(".png");
    expect(extensionFor(null, null)).toBe(".jpg");
  });
});

describe("checkFileName", () => {
  it("adds the photo's file type to what the owner typed", () => {
    expect(checkFileName(" Spotted Mare ", ".jpg")).toEqual({ ok: true, name: "Spotted Mare.jpg" });
  });
  it("ignores an image extension the owner typed and uses the real one", () => {
    expect(checkFileName("mare.png", ".jpg")).toEqual({ ok: true, name: "mare.jpg" });
    expect(checkFileName("mare.JPG", ".jpg")).toEqual({ ok: true, name: "mare.jpg" });
  });
  it("rejects empty names, slashes and over-long names", () => {
    expect(checkFileName("   ", ".jpg").ok).toBe(false);
    expect(checkFileName(".jpg", ".jpg").ok).toBe(false);
    expect(checkFileName("a/b", ".jpg").ok).toBe(false);
    expect(checkFileName("a".repeat(300), ".jpg").ok).toBe(false);
  });
});
