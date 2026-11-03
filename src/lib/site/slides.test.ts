import { describe, expect, it } from "vitest";
import { slideHref } from "./slides";

const categories = [{ id: "horse.stallion", species: "horse" as const, path_segment: "stallions" }];
const none = { kind: "none" as const, page: null, categoryId: null, url: null };

describe("slideHref", () => {
  it("has no link when the slide has no button", () => {
    expect(slideHref(none, { categories })).toBeNull();
  });
  it("maps pages, including the combined For Sale page", () => {
    expect(slideHref({ ...none, kind: "page", page: "for_sale" }, { categories })).toBe("/for-sale");
    expect(slideHref({ ...none, kind: "page", page: "updates" }, { categories })).toBe("/on-the-ranch");
  });
  it("maps a category to its listing page", () => {
    expect(slideHref({ ...none, kind: "category", categoryId: "horse.stallion" }, { categories })).toBe(
      "/horses/stallions",
    );
  });
  it("drops the button when the category or animal no longer exists", () => {
    expect(slideHref({ ...none, kind: "category", categoryId: "gone" }, { categories })).toBeNull();
    expect(slideHref({ ...none, kind: "animal" }, { categories, animal: null })).toBeNull();
  });
  it("links an animal and only allows http(s) external URLs", () => {
    expect(
      slideHref({ ...none, kind: "animal" }, { categories, animal: { species: "cattle", slug: "fw-outlaw" } }),
    ).toBe("/cattle/fw-outlaw");
    expect(slideHref({ ...none, kind: "external", url: "https://example.com/x" }, { categories })).toBe(
      "https://example.com/x",
    );
    expect(slideHref({ ...none, kind: "external", url: "javascript:alert(1)" }, { categories })).toBeNull();
  });
});
