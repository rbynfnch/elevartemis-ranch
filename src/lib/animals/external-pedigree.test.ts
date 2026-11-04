import { describe, expect, it } from "vitest";
import { allBreedPedigreeUrl } from "./external-pedigree";

describe("allBreedPedigreeUrl", () => {
  it("joins the words with +", () => {
    expect(allBreedPedigreeUrl("FWR Thunder Storm")).toBe("https://www.allbreedpedigree.com/fwr+thunder+storm");
  });
  it("drops punctuation and accents, and keeps numbers", () => {
    expect(allBreedPedigreeUrl("Doc's  Oak-Hickory (2nd)")).toBe(
      "https://www.allbreedpedigree.com/docs+oak+hickory+2nd",
    );
    expect(allBreedPedigreeUrl("Café Dorée")).toBe("https://www.allbreedpedigree.com/cafe+doree");
  });
  it("gives nothing for a name with no letters", () => {
    expect(allBreedPedigreeUrl("  --  ")).toBeNull();
  });
});
