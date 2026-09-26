import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";
import { newPasswordFormSchema, passwordSchema } from "./password";
import { authErrorMessage, dbErrorMessage } from "./messages";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/admin")).toBe("/admin");
    expect(safeNext("/admin/animals?tab=horses")).toBe("/admin/animals?tab=horses");
    expect(safeNext("/admin/set-password?welcome=1")).toBe("/admin/set-password?welcome=1");
  });
  it("rejects anything that could leave the site or loop", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/admin\\..\\x",
      "javascript:alert(1)",
      "/horses",
      "/administrator",
      "/admin/login",
      "/admin/login?next=/",
      "/admin/auth/confirm",
      "",
      42,
      null,
    ]) {
      expect(safeNext(bad)).toBe("/admin");
    }
  });
});

describe("password rules", () => {
  it("matches the Supabase policy", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("onlyletters").success).toBe(false);
    expect(passwordSchema.safeParse("1234567890").success).toBe(false);
    expect(passwordSchema.safeParse("ranch-demo-2026").success).toBe(true);
  });
  it("requires matching confirmation", () => {
    const r = newPasswordFormSchema.safeParse({ password: "ranch-demo-2026", confirm: "ranch-demo-2027" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["confirm"]);
  });
});

describe("messages", () => {
  it("never leaks raw auth codes", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toMatch(/don't match/);
    expect(authErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
    expect(authErrorMessage({ code: "something_new" })).toBe("Something went wrong. Please try again.");
  });
  it("passes through ranch rule messages and maps Postgres codes", () => {
    expect(dbErrorMessage({ code: "RA004", message: "Big Red isn't recorded as female, so can't be a dam." })).toMatch(
      /Big Red/,
    );
    expect(
      dbErrorMessage({
        code: "23505",
        message: 'duplicate key value violates unique constraint "animals_ranch_id_slug_key"',
      }),
    ).toMatch(/already in use/);
    expect(dbErrorMessage({ code: "42501" })).toMatch(/permission/);
    expect(dbErrorMessage({ code: "XX000", message: "internal detail" })).not.toMatch(/internal/);
  });
});
