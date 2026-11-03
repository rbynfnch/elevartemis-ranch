import { describe, expect, it } from "vitest";
import { checkFileName, cleanFileName, uniqueFileName } from "./file-names";

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

describe("checkFileName", () => {
  it("accepts a normal name", () => {
    expect(checkFileName(" stallion1.jpg ")).toEqual({ ok: true, name: "stallion1.jpg" });
  });
  it("rejects empty names, slashes and missing extensions", () => {
    expect(checkFileName("   ").ok).toBe(false);
    expect(checkFileName("a/b.jpg").ok).toBe(false);
    expect(checkFileName("stallion").ok).toBe(false);
  });
});
