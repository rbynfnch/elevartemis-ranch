import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import {
  buildPhotoIndex,
  findPhoto,
  mapHeader,
  parseBirth,
  parseFacts,
  parsePrice,
  planImport,
  type ImportContext,
} from "./animals";

const ctx: ImportContext = {
  enabledSpecies: ["horse", "cattle"],
  categories: [
    {
      id: "horse.stallion",
      species: "horse",
      label: "Stallion",
      labelPlural: "Stallions",
      key: "stallion",
      allowedSexes: ["male"],
    },
    { id: "horse.mare", species: "horse", label: "Mare", labelPlural: "Mares", key: "mare", allowedSexes: ["female"] },
    { id: "cattle.bull", species: "cattle", label: "Bull", labelPlural: "Bulls", key: "bull", allowedSexes: ["male"] },
    { id: "cattle.cow", species: "cattle", label: "Cow", labelPlural: "Cows", key: "cow", allowedSexes: ["female"] },
  ],
  photos: [
    { id: "p1", name: "stallion1.jpg" },
    { id: "p2", name: "Mare Front.PNG" },
    { id: "p3", name: "dup.jpg" },
    { id: "p4", name: "dup.png" },
  ],
  existing: [
    { id: "a-1", species: "horse", name: "Blue Star" },
    { id: "a-2", species: "horse", name: "Twin" },
    { id: "a-3", species: "horse", name: "Twin" },
  ],
};

const plan = (csv: string) => planImport(parseCsv(csv), ctx);

describe("values", () => {
  it("reads birth dates at the precision they were written", () => {
    expect(parseBirth("2019")).toEqual({ date: "2019-01-01", precision: "year" });
    expect(parseBirth("2019-05")).toEqual({ date: "2019-05-01", precision: "month" });
    expect(parseBirth("2019-05-03")).toEqual({ date: "2019-05-03", precision: "day" });
    expect(parseBirth("5/3/2019")).toEqual({ date: "2019-05-03", precision: "day" });
    expect(parseBirth("May 2019")).toEqual({ date: "2019-05-01", precision: "month" });
    expect(parseBirth("2019-02-30")).toBeNull();
    expect(parseBirth("last spring")).toBeNull();
  });
  it("reads prices in dollars", () => {
    expect(parsePrice("$8,500")).toBe(850000);
    expect(parsePrice("8500.50")).toBe(850050);
    expect(parsePrice("a lot")).toBeNull();
  });
  it("reads Quick Facts as Label: value pairs", () => {
    expect(parseFacts("Height: 15.1 hands; Discipline: Barrel racing")).toEqual({
      facts: [
        { label: "Height", value: "15.1 hands" },
        { label: "Discipline", value: "Barrel racing" },
      ],
    });
    expect(parseFacts("Height 15.1")).toHaveProperty("error");
  });
  it("accepts friendly column names and reports ones it doesn't know", () => {
    const { columns, unknown } = mapHeader(["Name", "DOB", "Show on website", "Favourite food"]);
    expect(columns).toEqual(["name", "birth_date", "published", null]);
    expect(unknown).toEqual(["Favourite food"]);
  });
});

describe("photo names", () => {
  const index = buildPhotoIndex(ctx.photos);
  it("finds a photo by its name, with or without the file type, ignoring capitals", () => {
    expect(findPhoto(index, "STALLION1.JPG")).toEqual({ id: "p1" });
    expect(findPhoto(index, "stallion1")).toEqual({ id: "p1" });
    expect(findPhoto(index, "mare front")).toEqual({ id: "p2" });
  });
  it("reports a missing photo and a name that matches two", () => {
    expect(findPhoto(index, "nope.jpg")).toEqual({ problem: "missing" });
    expect(findPhoto(index, "dup")).toEqual({ problem: "ambiguous" });
    expect(findPhoto(index, "dup.png")).toEqual({ id: "p4" });
  });
});

describe("planImport", () => {
  it("plans a new animal from a minimal row, working out the species and sex", () => {
    const result = plan("name,category\nCopper Ridge,Bull\n");
    expect(result.results[0].errors).toEqual([]);
    expect(result.results[0].planned).toMatchObject({
      action: "create",
      species: "cattle",
      fields: { category_id: "cattle.bull", sex: "male" },
    });
  });

  it("updates an existing animal by id or by unique name, and leaves blank cells alone", () => {
    const byName = plan("name,category,breed,color\nblue star,Mare,Appaloosa,\n").results[0].planned!;
    expect(byName).toMatchObject({ action: "update", existingId: "a-1" });
    expect(byName.fields).toEqual({ category_id: "horse.mare", breed: "Appaloosa" });
    const byId = plan("id,name,color\na-1,Blue Star Renamed,Bay\n").results[0].planned!;
    expect(byId).toMatchObject({ action: "update", existingId: "a-1", name: "Blue Star Renamed" });
  });

  it("explains every problem, with the row and column", () => {
    const result = plan(
      [
        "name,species,category,sex,birth_date,price",
        ",horse,Mare,,,",
        "Rex,llama,,,,",
        "Dolly,horse,Stallion,female,,",
        "Sue,horse,Mare,,sometime,",
        "Bob,horse,Mare,,,5000",
      ].join("\n"),
    );
    const errors = result.results.map((r) => r.errors.join(" | "));
    expect(errors[0]).toContain("name: enter a name");
    expect(errors[1]).toContain("species: “llama”");
    expect(errors[2]).toContain("can't be female");
    expect(errors[3]).toContain("birth_date");
    expect(errors[4]).toContain("for_sale = available");
    expect(result.results.map((r) => r.line)).toEqual([2, 3, 4, 5, 6]);
    expect(result.results.every((r) => r.planned === null)).toBe(true);
  });

  it("refuses ambiguous names and a name listed twice", () => {
    const twin = plan("name,species,category\nTwin,horse,Mare\n").results[0];
    expect(twin.errors[0]).toContain("Add the id column");
    const twice = plan("name,category\nNew Foal,Mare\nnew foal,Mare\n").results;
    expect(twice[0].errors).toEqual([]);
    expect(twice[1].errors[0]).toContain("more than once");
  });

  it("warns about missing photos but still imports the animal", () => {
    const result = plan("name,category,photos\nColt,Stallion,stallion1; missing.jpg\n");
    expect(result.results[0].planned?.fields.photoIds).toEqual(["p1"]);
    expect(result.results[0].planned?.warnings[0]).toContain("missing.jpg");
    expect(result.missingPhotos).toEqual(["missing.jpg"]);
  });

  it("collects the breeds the file uses, and reads sale details", () => {
    const result = plan('name,category,breed,for_sale,price\nA,Bull,Hereford,available,"$2,500"\nB,Bull,hereford,,\n');
    expect(result.breeds).toEqual([{ species: "cattle", name: "Hereford" }]);
    expect(result.results[0].planned?.fields.sale).toEqual({ status: "available", priceCents: 250000 });
  });

  it("rejects an empty file, a missing name column and too many rows", () => {
    expect(plan("").fileErrors[0]).toContain("empty");
    expect(plan("breed\nX").fileErrors[0]).toContain("“name” column");
    const many = `name,category\n${"X,Bull\n".repeat(501)}`;
    expect(plan(many).fileErrors[0]).toContain("500");
  });
});
