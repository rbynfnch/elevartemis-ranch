import { importColumns, templateExamples } from "./animals";
import { pedigreeColumns, templateRows } from "./pedigree";
import { toCsv } from "./csv";

/** The downloadable template: the column names plus two example rows that the importer skips. */
export function templateCsv(): string {
  return toCsv(
    [...importColumns],
    templateExamples.map((row) => importColumns.map((c) => row[c])),
  );
}

/** The pedigree template: the columns plus example rows that the importer skips. */
export function pedigreeTemplateCsv(): string {
  return toCsv(
    [...pedigreeColumns],
    templateRows.map((row) => pedigreeColumns.map((c) => row[c])),
  );
}
