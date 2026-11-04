import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { parsePosition, planPedigreeImport, positionLabel, type KnownAnimal, type PedigreePlan } from "./pedigree";

const animal = (over: Partial<KnownAnimal> & { id: string; name: string }): KnownAnimal => ({
  species: "horse",
  sex: "male",
  scope: "inventory",
  registry: null,
  registrationNumber: null,
  birthYear: null,
  color: null,
  height: null,
  breed: null,
  sireId: null,
  damId: null,
  ...over,
});

const rose = animal({ id: "rose", name: "Triple Blue Rose", sex: "female" });
const header = "animal,position,name,registry,registration_number,birth_year,color,height\n";
const plan = (rows: string, known: KnownAnimal[] = [rose]): PedigreePlan =>
  planPedigreeImport(parseCsv(header + rows), known);
const errorsOf = (p: PedigreePlan) => p.rows.flatMap((r) => r.errors);

describe("parsePosition / positionLabel", () => {
  it("reads letters and words", () => {
    expect(parsePosition("SD")).toBe("SD");
    expect(parsePosition("ssd")).toBe("SSD");
    expect(parsePosition("Sire's dam")).toBe("SD");
    expect(parsePosition("sire of sire")).toBe("SS");
    expect(parsePosition("s-d-d")).toBe("SDD");
    expect(parsePosition("dam")).toBe("D");
  });
  it("refuses what isn't a place, or is too deep", () => {
    expect(parsePosition("")).toBeNull();
    expect(parsePosition("grandpa")).toBeNull();
    expect(parsePosition("SSSSSSS")).toBeNull();
    expect(parsePosition("SSSSSS")).toBe("SSSSSS");
  });
  it("describes a place in words", () => {
    expect(positionLabel("S")).toBe("Sire");
    expect(positionLabel("SSD")).toBe("Sire's sire's dam");
  });
});

describe("planPedigreeImport", () => {
  it("makes new ancestors and links each to its child", () => {
    const p = plan("Triple Blue Rose,S,Sire One\nTriple Blue Rose,D,Dam One\nTriple Blue Rose,SS,Grandsire");
    expect(errorsOf(p)).toEqual([]);
    expect(p.newAncestors.map((a) => [a.name, a.sex])).toEqual([
      ["Sire One", "male"],
      ["Dam One", "female"],
      ["Grandsire", "male"],
    ]);
    expect(p.links).toEqual([
      { child: { id: "rose" }, role: "sire", parent: { key: "1" } },
      { child: { id: "rose" }, role: "dam", parent: { key: "2" } },
      { child: { key: "1" }, role: "sire", parent: { key: "3" } },
    ]);
    expect(p.rows.every((r) => r.outcome === "new")).toBe(true);
  });

  it("makes a linebred ancestor once", () => {
    const p = plan(
      "Triple Blue Rose,S,Sire\nTriple Blue Rose,D,Dam\nTriple Blue Rose,SS,Doc Bar,AQHA,1\nTriple Blue Rose,DS,doc bar",
    );
    expect(p.newAncestors.filter((a) => a.name.toLowerCase() === "doc bar")).toHaveLength(1);
    const doc = p.newAncestors.find((a) => a.name === "Doc Bar")!;
    expect(doc.registrationNumber).toBe("1");
    expect(p.links.filter((l) => "key" in l.parent && l.parent.key === doc.key)).toHaveLength(2);
  });

  it("keeps same-named animals apart when their registrations differ", () => {
    const p = plan(
      "Triple Blue Rose,S,Sire\nTriple Blue Rose,D,Dam\nTriple Blue Rose,SS,Doc,AQHA,1\nTriple Blue Rose,DS,Doc,AQHA,2",
    );
    expect(p.newAncestors.filter((a) => a.name === "Doc")).toHaveLength(2);
  });

  it("links an ancestor that is one of the ranch's own animals", () => {
    const sire = animal({ id: "bluesire", name: "Blue Sire" });
    const p = plan("Triple Blue Rose,S,blue sire", [rose, sire]);
    expect(p.newAncestors).toEqual([]);
    expect(p.links).toEqual([{ child: { id: "rose" }, role: "sire", parent: { id: "bluesire" } }]);
    expect(p.rows[0].outcome).toBe("yours");
  });

  it("reuses a recorded ancestor and fills only its blanks", () => {
    const old = animal({ id: "old", name: "Old Sire", scope: "pedigree_only", color: "Bay" });
    const p = plan("Triple Blue Rose,S,Old Sire,AQHA,55,1999,Black,15.2hh", [rose, old]);
    expect(p.newAncestors).toEqual([]);
    expect(p.fills).toEqual([
      { id: "old", fields: { registry: "AQHA", registration_number: "55", birth_year: 1999, height: "15.2hh" } },
    ]);
    expect(p.rows[0]).toMatchObject({
      outcome: "recorded",
      fills: ["registry", "registration number", "birth year", "height"],
    });
  });

  it("does not treat a same-named animal with another registration as the same", () => {
    const old = animal({ id: "old", name: "Old Sire", scope: "pedigree_only", registrationNumber: "1" });
    const p = plan("Triple Blue Rose,S,Old Sire,,2", [rose, old]);
    expect(p.newAncestors).toHaveLength(1);
  });

  it("asks when two recorded animals share a name and nothing says which", () => {
    const a = animal({ id: "a", name: "Dun It", scope: "pedigree_only" });
    const b = animal({ id: "b", name: "Dun It", scope: "pedigree_only" });
    expect(errorsOf(plan("Triple Blue Rose,S,Dun It", [rose, a, b]))[0]).toMatch(/More than one animal named/);
    expect(errorsOf(plan("Triple Blue Rose,S,Dun It,,", [rose, a, { ...b, registrationNumber: "9" }]))).toEqual([
      expect.stringMatching(/More than one/),
    ]);
  });

  it("refuses a stallion as a dam", () => {
    const stud = animal({ id: "stud", name: "Big Stud" });
    expect(errorsOf(plan("Triple Blue Rose,D,Big Stud", [rose, stud]))[0]).toMatch(/can't be a dam/);
  });

  it("needs a parent before a grandparent, in any row order", () => {
    const bad = plan("Triple Blue Rose,SSD,Great Granddam");
    expect(errorsOf(bad)[0]).toMatch(/Sire's sire isn't recorded yet/);
    const good = plan("Triple Blue Rose,SSD,GG\nTriple Blue Rose,S,A\nTriple Blue Rose,SS,B");
    expect(errorsOf(good)).toEqual([]);
    expect(good.newAncestors).toHaveLength(3);
  });

  it("builds on a pedigree the animal already has, and leaves filled places alone", () => {
    const sire = animal({ id: "sire", name: "Existing Sire", scope: "pedigree_only" });
    const hasSire = { ...rose, sireId: "sire" };
    const p = plan("Triple Blue Rose,S,Someone Else\nTriple Blue Rose,SS,New Grandsire", [hasSire, sire]);
    expect(p.rows[0].outcome).toBe("already");
    expect(p.rows[0].warnings[0]).toMatch(/Existing Sire is already recorded/);
    expect(p.links).toEqual([{ child: { id: "sire" }, role: "sire", parent: { key: "2" } }]);
    expect(p.newAncestors.map((a) => a.name)).toEqual(["New Grandsire"]);
  });

  it("rejects a repeated place and an animal as its own ancestor", () => {
    const p = plan("Triple Blue Rose,S,One\nTriple Blue Rose,S,Two");
    expect(errorsOf(p)[0]).toMatch(/more than once/);
    expect(errorsOf(plan("Triple Blue Rose,D,Triple Blue Rose"))[0]).toMatch(/own pedigree/);
  });

  it("keeps the animal from the row above when the cell is blank", () => {
    const p = plan("Triple Blue Rose,S,A\n,D,B");
    expect(errorsOf(p)).toEqual([]);
    expect(p.links).toHaveLength(2);
  });

  it("skips unknown names and template examples, and explains bad rows", () => {
    const p = plan(
      "Triple Blue Rose,S,Unknown\nExample Horse,S,Example Sire\nNobody,S,A\nTriple Blue Rose,XYZ,B\nTriple Blue Rose,,C",
    );
    expect(p.skippedUnknown).toBe(1);
    expect(p.skippedExamples).toBe(1);
    expect(p.rows.map((r) => r.errors.length > 0)).toEqual([true, true, true]);
    expect(p.newAncestors).toEqual([]);
  });

  it("makes no ancestor for a row that was rejected", () => {
    const p = plan("Triple Blue Rose,SS,Orphan");
    expect(p.newAncestors).toEqual([]);
  });

  it("needs the key columns", () => {
    expect(planPedigreeImport(parseCsv("name\nA"), [rose]).fileErrors).toHaveLength(2);
  });

  it("does not let two pedigrees give the same animal different parents", () => {
    const foal = animal({ id: "foal", name: "Foal", sex: "female" });
    const p = plan("Triple Blue Rose,S,Shared Sire\nTriple Blue Rose,SS,Grand A\nFoal,S,Shared Sire\nFoal,SS,Grand B", [
      rose,
      foal,
    ]);
    expect(errorsOf(p)[0]).toMatch(/contradicts row 3/);
  });

  it("drops a bad year but keeps the ancestor", () => {
    const p = plan("Triple Blue Rose,S,A,,,19x,,");
    expect(p.rows[0].warnings[0]).toMatch(/birth year/);
    expect(p.newAncestors[0].birthYear).toBeNull();
  });
});
