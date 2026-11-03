import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";

describe("parseCsv", () => {
  it("reads a header and rows", () => {
    expect(parseCsv("name,breed\nBlue Star,Appaloosa\nCopper,Hereford\n")).toEqual({
      header: ["name", "breed"],
      rows: [
        ["Blue Star", "Appaloosa"],
        ["Copper", "Hereford"],
      ],
    });
  });
  it("handles quotes, commas, doubled quotes and line breaks inside a field", () => {
    const csv = 'name,description\r\n"Blue, Star","She said ""hi""\nand left"\r\n';
    expect(parseCsv(csv).rows).toEqual([["Blue, Star", 'She said "hi"\nand left']]);
  });
  it("ignores a byte-order mark and blank lines", () => {
    expect(parseCsv("﻿name\n\nBlue\n\n").rows).toEqual([["Blue"]]);
  });
  it("reads semicolon- and tab-separated files", () => {
    expect(parseCsv("name;breed\nBlue;Appaloosa").rows).toEqual([["Blue", "Appaloosa"]]);
    expect(parseCsv("name\tbreed\nBlue\tAppaloosa").header).toEqual(["name", "breed"]);
  });
  it("keeps empty cells and handles a missing final newline", () => {
    expect(parseCsv("a,b,c\n1,,3").rows).toEqual([["1", "", "3"]]);
  });
  it("returns an empty result for an empty file", () => {
    expect(parseCsv("")).toEqual({ header: [], rows: [] });
  });
});

describe("toCsv", () => {
  it("round-trips awkward values", () => {
    const rows = [['Blue, "Star"', "line one\nline two", ""]];
    const back = parseCsv(toCsv(["name", "notes", "x"], rows));
    expect(back.header).toEqual(["name", "notes", "x"]);
    expect(back.rows).toEqual(rows);
  });
});
