import { describe, expect, it } from "vitest";
import { groupFaqs, type FaqRow } from "./group";

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const faq = (id: string, group: string | null, sort: number, over: Partial<FaqRow> = {}): FaqRow => ({
  id,
  question: `Question ${id}?`,
  answer: doc("Answer"),
  group_label: group,
  sort_order: sort,
  ...over,
});

describe("groupFaqs", () => {
  it("groups Horses, Cattle and General in the order the owner set", () => {
    const groups = groupFaqs([
      faq("general", "General", 90),
      faq("epd", "Cattle", 22),
      faq("bloodlines-horses", "Horses", 10),
      faq("bloodlines-cattle", "Cattle", 20),
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Horses", "Cattle", "General"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["bloodlines-cattle", "epd"]);
  });

  it("never shows an empty group or an unanswered question", () => {
    const groups = groupFaqs([
      faq("h1", "Horses", 1, { is_published: false }),
      faq("c1", "Cattle", 2, { answer: { type: "doc", content: [{ type: "paragraph" }] } }),
      faq("c2", "Cattle", 3),
      faq("g1", "General", 4, { question: "   " }),
      faq("g2", "General", 5),
    ]);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Cattle", ["c2"]],
      ["General", ["g2"]],
    ]);
  });

  it("drops the heading when there is only one group", () => {
    expect(groupFaqs([faq("a", "Cattle", 1), faq("b", "Cattle", 2)])).toEqual([
      { label: null, items: [expect.objectContaining({ id: "a" }), expect.objectContaining({ id: "b" })] },
    ]);
    expect(groupFaqs([])).toEqual([]);
  });

  it("treats blank group labels as ungrouped", () => {
    const groups = groupFaqs([faq("a", " ", 1), faq("b", "Horses", 2)]);
    expect(groups.map((g) => g.label)).toEqual([null, "Horses"]);
  });
});
