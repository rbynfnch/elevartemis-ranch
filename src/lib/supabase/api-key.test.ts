import { describe, expect, it, vi } from "vitest";
import { isJwtKey, keyAwareFetch } from "./api-key";

const NEW_KEY = "sb_publishable_abcdefghijklmnopqrstuvwxyz";
const JWT_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJl";

function capture() {
  const base = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
  const sent = () => new Headers(base.mock.calls[0][1]?.headers);
  return { base, sent };
}

describe("isJwtKey", () => {
  it("tells legacy JWT keys from new-style keys", () => {
    expect(isJwtKey(JWT_KEY)).toBe(true);
    expect(isJwtKey(NEW_KEY)).toBe(false);
  });
});

describe("keyAwareFetch", () => {
  it("drops a new-style key sent as the Bearer token and keeps apikey", async () => {
    const { base, sent } = capture();
    await keyAwareFetch(NEW_KEY, base)("https://x.test/rest/v1/t", {
      headers: { apikey: NEW_KEY, Authorization: `Bearer ${NEW_KEY}` },
    });
    expect(sent().get("Authorization")).toBeNull();
    expect(sent().get("apikey")).toBe(NEW_KEY);
  });

  it("keeps a real user access token", async () => {
    const { base, sent } = capture();
    await keyAwareFetch(NEW_KEY, base)("https://x.test/rest/v1/t", {
      headers: { apikey: NEW_KEY, Authorization: `Bearer ${JWT_KEY}` },
    });
    expect(sent().get("Authorization")).toBe(`Bearer ${JWT_KEY}`);
  });

  it("adds apikey when missing", async () => {
    const { base, sent } = capture();
    await keyAwareFetch(NEW_KEY, base)("https://x.test/rest/v1/t");
    expect(sent().get("apikey")).toBe(NEW_KEY);
  });

  it("passes legacy JWT keys through untouched", async () => {
    const base = vi.fn() as unknown as typeof fetch;
    expect(keyAwareFetch(JWT_KEY, base)).toBe(base);
  });
});
