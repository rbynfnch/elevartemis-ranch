import { describe, expect, it } from "vitest";
import { emailBody, emailSubject, inquirySchema, looksAutomated, topicOptions } from "./inquiry";

const valid = { name: "Pat", email: "pat@example.com", message: "Hello" };

describe("inquirySchema", () => {
  it("accepts a normal message and trims it", () => {
    const r = inquirySchema.parse({ ...valid, name: "  Pat  ", message: " Hello " });
    expect(r.name).toBe("Pat");
    expect(r.message).toBe("Hello");
    expect(r.topic).toBe("");
  });
  it("explains what is wrong, in plain words", () => {
    const r = inquirySchema.safeParse({ name: "", email: "nope", message: "" });
    expect(r.success).toBe(false);
    const messages = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining(["Enter your name.", "Write a message."]));
    expect(messages.some((m) => /valid email/.test(m))).toBe(true);
  });
  it("limits the message length", () => {
    expect(inquirySchema.safeParse({ ...valid, message: "x".repeat(4001) }).success).toBe(false);
  });
});

describe("looksAutomated", () => {
  const now = 1_000_000_000;
  it("passes a form filled in at a human pace", () => {
    expect(looksAutomated({ website: "", startedAt: now - 20_000 }, now)).toBe(false);
  });
  it("catches the hidden box, a too-fast send, and a stale or missing timestamp", () => {
    expect(looksAutomated({ website: "http://spam", startedAt: now - 20_000 }, now)).toBe(true);
    expect(looksAutomated({ website: "", startedAt: now - 500 }, now)).toBe(true);
    expect(looksAutomated({ website: "", startedAt: now - 2 * 24 * 3600 * 1000 }, now)).toBe(true);
    expect(looksAutomated({ website: "", startedAt: 0 }, now)).toBe(true);
    expect(looksAutomated({ website: "", startedAt: Number.NaN }, now)).toBe(true);
  });
});

describe("topicOptions", () => {
  it("offers only the species the ranch has, with the animal first when asked about one", () => {
    expect(topicOptions(["cattle"])).toEqual(["A question about the ranch", "Cattle", "Something else"]);
    expect(topicOptions(["horse", "cattle"], "Big Red")[0]).toBe("Big Red");
  });
});

describe("email", () => {
  it("builds a subject and a readable body", () => {
    expect(emailSubject({ name: "Pat", topic: "Horses" })).toBe("New message from Pat: Horses");
    expect(emailSubject({ name: "Pat", topic: "" })).toBe("New message from Pat");
    const body = emailBody({
      name: "Pat",
      email: "pat@example.com",
      topic: "Horses",
      animalName: "Big Red",
      message: "Hi",
    });
    expect(body).toContain("From: Pat <pat@example.com>");
    expect(body).toContain("About: Big Red");
    expect(body).toContain("Hi");
  });
});
