import { describe, expect, it } from "vitest";
import { richTextIsEmpty } from "@/lib/content/empty";
import { textToDoc } from "@/lib/admin/form-values";
import { tidyFaqs, type FaqInput } from "./fields";

const faq = (over: Partial<FaqInput> = {}): FaqInput => ({
  id: null,
  question: "  Do you   ship? ",
  answer: textToDoc("Yes, with notice."),
  group: "",
  isPublished: true,
  ...over,
});

describe("tidyFaqs", () => {
  it("tidies a question and keeps its order", () => {
    const r = tidyFaqs([faq(), faq({ question: "Second?", group: " Buying " })], richTextIsEmpty);
    expect(r.ok && r.items.map((i) => [i.question, i.group_label])).toEqual([
      ["Do you ship?", null],
      ["Second?", "Buying"],
    ]);
  });
  it("needs a question and an answer, and says which", () => {
    expect(tidyFaqs([faq({ question: " " })], richTextIsEmpty)).toMatchObject({
      ok: false,
      message: "Question 1 needs some words.",
    });
    const r = tidyFaqs([faq({ answer: null })], richTextIsEmpty);
    expect(!r.ok && r.message).toMatch(/Write an answer for “Do you ship\?”/);
  });
  it("accepts an empty list", () => {
    expect(tidyFaqs([], richTextIsEmpty).ok).toBe(true);
  });
});
