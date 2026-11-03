/**
 * A small, careful CSV reader and writer (RFC 4180): quoted fields, commas and
 * line breaks inside quotes, doubled quotes, CRLF, and the byte-order mark that
 * Excel adds. It also copes with the semicolon- and tab-separated files some
 * spreadsheet programs produce.
 */

export type Csv = { header: string[]; rows: string[][] };

function detectDelimiter(firstLine: string): string {
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export function parseCsv(input: string): Csv {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);

  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") {
      quoted = true;
    } else if (c === delimiter) {
      record.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  // Rows that are entirely empty (a trailing blank line, or a spreadsheet's empty rows) are not data.
  const kept = records.filter((r) => r.some((cell) => cell.trim() !== ""));
  const [header = [], ...rows] = kept;
  return { header: header.map((h) => h.trim()), rows };
}

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) || /^\s|\s$/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Writes rows as CSV. Excel opens it correctly thanks to the leading byte-order mark. */
export function toCsv(header: string[], rows: string[][]): string {
  return `﻿${[header, ...rows].map((r) => r.map(escapeField).join(",")).join("\r\n")}\r\n`;
}
