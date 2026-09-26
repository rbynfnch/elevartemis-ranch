import { describe, expect, it } from "vitest";
import { adminSubpath, hostPort, isFallbackEligibleHost, normalizeHost } from "./host";

describe("normalizeHost", () => {
  it("lowercases and strips port and trailing dot", () => {
    expect(normalizeHost("Demo.LocalHost:3000")).toBe("demo.localhost");
    expect(normalizeHost("www.Example.com.")).toBe("www.example.com");
  });
  it("handles missing input and IPv6", () => {
    expect(normalizeHost(null)).toBe("");
    expect(normalizeHost("[::1]:3000")).toBe("[::1]");
  });
});

describe("hostPort", () => {
  it("extracts the port", () => {
    expect(hostPort("demo.localhost:3000")).toBe("3000");
    expect(hostPort("ranch.com")).toBeUndefined();
  });
});

describe("adminSubpath", () => {
  it("extracts the admin route", () => {
    expect(adminSubpath("/admin")).toBe("");
    expect(adminSubpath("/admin/")).toBe("");
    expect(adminSubpath("/admin/animals")).toBe("/animals");
    expect(adminSubpath("/admin/login/verify/")).toBe("/login/verify");
  });
  it("ignores public paths", () => {
    expect(adminSubpath("/administration")).toBeNull();
    expect(adminSubpath("/horses")).toBeNull();
  });
});

describe("isFallbackEligibleHost", () => {
  it("allows only local and preview hosts", () => {
    for (const h of ["localhost", "127.0.0.1", "demo.localhost", "ranch-git-main-elevartemis.vercel.app"]) {
      expect(isFallbackEligibleHost(h)).toBe(true);
    }
    for (const h of ["unknown.example", "vercel.app.evil.com", "localhost.evil.com"]) {
      expect(isFallbackEligibleHost(h)).toBe(false);
    }
  });
});
