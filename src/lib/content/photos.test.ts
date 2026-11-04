import { describe, expect, it } from "vitest";
import { collectPhotoIds, isPhotoId } from "./photos";

const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";

describe("collectPhotoIds", () => {
  it("finds photos anywhere in the text, once each, in order", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
        { type: "image", attrs: { mediaId: b } },
        { type: "blockquote", content: [{ type: "image", attrs: { mediaId: a } }] },
        { type: "image", attrs: { mediaId: b } },
      ],
    };
    expect(collectPhotoIds(doc)).toEqual([b, a]);
  });
  it("ignores anything that isn't a real photo id", () => {
    expect(
      collectPhotoIds({
        type: "doc",
        content: [{ type: "image", attrs: { mediaId: "../../etc" } }, { type: "image" }],
      }),
    ).toEqual([]);
    expect(collectPhotoIds(null)).toEqual([]);
    expect(isPhotoId(a)).toBe(true);
    expect(isPhotoId("nope")).toBe(false);
  });
});
