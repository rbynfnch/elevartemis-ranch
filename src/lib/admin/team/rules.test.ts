import { describe, expect, it } from "vitest";
import { tidyEmail, whyCannotChangeRole, whyCannotRemove, type Member } from "./rules";

const team: Member[] = [
  { userId: "a", email: "owner@x.com", role: "owner" },
  { userId: "b", email: "ed@x.com", role: "editor" },
];

describe("tidyEmail", () => {
  it("lowercases and checks", () => {
    expect(tidyEmail("  Pat@Example.COM ")).toBe("pat@example.com");
    expect(tidyEmail("nope")).toBeNull();
    expect(tidyEmail("a b@c.com")).toBeNull();
  });
});

describe("whyCannotRemove", () => {
  it("lets an owner remove an editor", () => {
    expect(whyCannotRemove(team, "b", "a")).toBeNull();
  });
  it("refuses removing yourself, the last owner, or a stranger", () => {
    expect(whyCannotRemove(team, "a", "a")).toMatch(/yourself/);
    expect(whyCannotRemove(team, "zzz", "a")).toMatch(/isn't on your team/);
    expect(whyCannotRemove([...team, { userId: "c", email: "o2@x.com", role: "owner" }], "c", "a")).toBeNull();
    expect(
      whyCannotRemove(
        [
          { userId: "c", email: "o2@x.com", role: "owner" },
          { userId: "a", email: "o@x.com", role: "owner" },
          { userId: "d", email: "d@x.com", role: "editor" },
        ],
        "c",
        "a",
      ),
    ).toBeNull();
  });
});

describe("whyCannotChangeRole", () => {
  it("lets an owner promote an editor", () => {
    expect(whyCannotChangeRole(team, "b", "a", "owner")).toBeNull();
  });
  it("keeps one owner, and stops owners demoting themselves", () => {
    expect(whyCannotChangeRole(team, "a", "a", "editor")).toMatch(/yourself/);
    const two = [...team, { userId: "c", email: "o2@x.com", role: "owner" as const }];
    expect(whyCannotChangeRole(two, "c", "a", "editor")).toBeNull();
    expect(whyCannotChangeRole(team, "a", "b", "editor")).toMatch(/at least one owner/);
  });
});
