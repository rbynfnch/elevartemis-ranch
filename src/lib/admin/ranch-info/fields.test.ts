import { describe, expect, it } from "vitest";
import { tidyInfo, tidyUrl, type RanchInfoInput } from "./fields";

const base: RanchInfoInput = {
  tagline: "  Raising   cattle ",
  intro: null,
  publicPhone: "",
  city: " Boise ",
  region: "ID",
  addressDisplay: "",
  hoursText: "",
  blogLabel: "",
  social: [],
};

describe("tidyUrl", () => {
  it("adds https, upgrades http and refuses non-addresses", () => {
    expect(tidyUrl("facebook.com/flyingw")).toBe("https://facebook.com/flyingw");
    expect(tidyUrl("http://example.com/x")).toBe("https://example.com/x");
    expect(tidyUrl("javascript:alert(1)")).toBeNull();
    expect(tidyUrl("not a link")).toBeNull();
    expect(tidyUrl("localhost")).toBeNull();
    expect(tidyUrl("")).toBeNull();
  });
});

describe("tidyInfo", () => {
  it("collapses spaces and turns blanks into null", () => {
    const r = tidyInfo(base);
    expect(r.ok && r.info.profile.tagline).toBe("Raising cattle");
    expect(r.ok && r.info.profile.city).toBe("Boise");
    expect(r.ok && r.info.profile.public_phone).toBeNull();
  });
  it("checks the phone number", () => {
    expect(tidyInfo({ ...base, publicPhone: "123" }).ok).toBe(false);
    expect(tidyInfo({ ...base, publicPhone: "(435) 555-0147" }).ok).toBe(true);
  });
  it("keeps good links in order and skips empty rows", () => {
    const r = tidyInfo({
      ...base,
      social: [
        { platform: "facebook", url: "", label: "" },
        { platform: "instagram", url: "instagram.com/fw", label: "" },
        { platform: "other", url: "https://aqha.com/x", label: "AQHA page" },
      ],
    });
    expect(r.ok && r.info.social.map((s) => [s.platform, s.label])).toEqual([
      ["instagram", null],
      ["other", "AQHA page"],
    ]);
  });
  it("refuses a bad link, a nameless 'other' link and a repeated platform", () => {
    expect(tidyInfo({ ...base, social: [{ platform: "facebook", url: "nope", label: "" }] }).ok).toBe(false);
    expect(tidyInfo({ ...base, social: [{ platform: "other", url: "https://a.com", label: "" }] }).ok).toBe(false);
    expect(
      tidyInfo({
        ...base,
        social: [
          { platform: "x", url: "x.com/a", label: "" },
          { platform: "x", url: "x.com/b", label: "" },
        ],
      }).ok,
    ).toBe(false);
  });
});
