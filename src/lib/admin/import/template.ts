import { importColumns, templateExamples } from "./animals";
import { toCsv } from "./csv";

/** The downloadable template: the column names plus two example rows that the importer skips. */
export function templateCsv(): string {
  return toCsv(
    [...importColumns],
    templateExamples.map((row) => importColumns.map((c) => row[c])),
  );
}
