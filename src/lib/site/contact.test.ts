import { describe, expect, it } from "vitest";
import { contactSchema, emptyContact, parseContact, toContactSections } from "./contact";

describe("contact content", () => {
  it("is empty for nothing or rubbish", () => {
    expect(parseContact(null)).toEqual(emptyContact);
    expect(parseContact([{ kind: "contact", heading: 5 }])).toEqual(emptyContact);
  });
  it("round-trips what the owner wrote", () => {
    const c = contactSchema.parse({ formHeading: "Write to us", heading: "Say hello", publicEmail: "hi@example.com" });
    const saved = toContactSections(c);
    expect(saved).toHaveLength(1);
    expect(parseContact(saved).publicEmail).toBe("hi@example.com");
  });
  it("saves nothing when nothing is filled in", () => {
    expect(toContactSections(emptyContact)).toEqual([]);
  });
  it("refuses an address that isn't an email", () => {
    expect(contactSchema.safeParse({ publicEmail: "not an email" }).success).toBe(false);
  });
});
