"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import clsx from "clsx";
import { commitPedigreeImportAction, previewPedigreeImportAction } from "@/lib/admin/import/actions";
import { pedigreeTemplateCsv } from "@/lib/admin/import/template";
import type { PedigreeImportPreview, PedigreeImportResult } from "@/lib/admin/import/pedigree-service";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { downloadCsv } from "./download";

type Message = { tone: "error" | "success"; text: string } | null;

const columnHelp: [string, string][] = [
  [
    "animal",
    "Whose pedigree this is: one of your animals, by name. Leave it blank on the rows below to keep the same animal.",
  ],
  ["animal_id", "Optional. From “Download my animals”, instead of the name."],
  ["species", "Optional. Only needed if you have a horse and a bull with the same name."],
  [
    "position",
    "S sire, D dam, SS sire's sire, SD sire's dam, DS dam's sire, DD dam's dam, then SSS, SSD… up to six letters (seven generations).",
  ],
  ["name", "The ancestor's name. “Unknown” or a blank name leaves that place empty."],
  ["registry, registration_number", "AQHA, ApHC… and the number. When both are filled in, they settle who is who."],
  ["birth_year, color, height, breed", "Optional. Height like 15.3hh."],
];

const outcomeText = {
  new: "New ancestor",
  yours: "Your animal, linked",
  recorded: "Already recorded",
  already: "Already in the pedigree",
} as const;

export function PedigreeImportWizard() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<PedigreeImportPreview | null>(null);
  const [result, setResult] = useState<PedigreeImportResult | null>(null);
  const [busy, setBusy] = useState<"" | "reading" | "importing">("");
  const [message, setMessage] = useState<Message>(null);
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setFileName("");
    setCsv("");
    setPreview(null);
    setResult(null);
    setMessage(null);
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    reset();
    if (file.size > 900_000) {
      setMessage({ tone: "error", text: "That file is too large. Split it into files of up to 500 rows." });
      return;
    }
    if (/\.xlsx?$/i.test(file.name)) {
      setMessage({
        tone: "error",
        text: "That's an Excel file. In Excel choose File, Save As, then “CSV (Comma delimited)”, and upload that.",
      });
      return;
    }
    setBusy("reading");
    const text = await file.text();
    const response = await previewPedigreeImportAction(text);
    setBusy("");
    if (!response.ok) return setMessage({ tone: "error", text: response.message });
    setFileName(file.name);
    setCsv(text);
    setPreview(response.data);
  }

  async function runImport() {
    setBusy("importing");
    setMessage(null);
    const response = await commitPedigreeImportAction(csv);
    setBusy("");
    if (!response.ok) return setMessage({ tone: "error", text: response.message });
    setResult(response.data);
    setPreview(null);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void chooseFile(e.dataTransfer.files[0]);
  }

  const usable = preview ? preview.rows.filter((r) => r.outcome && r.outcome !== "already").length : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={buttonClasses("secondary", "py-2")}
          onClick={() => downloadCsv("pedigree-template.csv", pedigreeTemplateCsv())}
        >
          Download template (with examples)
        </button>
      </div>

      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}

      {result ? <Done result={result} onAgain={reset} /> : null}

      {!result && !preview ? (
        <div
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={clsx(
            "flex flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-12 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-rule bg-white",
          )}
        >
          <p className="font-semibold">Drag your CSV file here, or</p>
          <button
            type="button"
            className={buttonClasses("primary")}
            onClick={() => fileInput.current?.click()}
            disabled={busy === "reading"}
          >
            {busy === "reading" ? "Checking your file…" : "Choose a CSV file"}
          </button>
          <p className="max-w-md text-sm text-ink-muted">
            You&apos;ll see exactly what will happen before anything is saved.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              void chooseFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}

      {preview ? (
        <Preview
          preview={preview}
          fileName={fileName}
          usable={usable}
          importing={busy === "importing"}
          onImport={runImport}
          onCancel={reset}
        />
      ) : null}

      <details className="border border-rule bg-white px-5 py-4">
        <summary className="cursor-pointer font-semibold">What goes in each column</summary>
        <dl className="mt-4 space-y-3 text-sm">
          {columnHelp.map(([col, text]) => (
            <div key={col} className="grid gap-1 sm:grid-cols-[16rem_1fr] sm:gap-4">
              <dt className="font-mono text-[0.8125rem]">{col}</dt>
              <dd className="text-ink-muted">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-muted">
          Places already filled in on an animal are never replaced. Details you leave blank never erase anything, and
          your own animals are never changed except for gaining a sire or dam. List a parent before that parent&apos;s
          own parents; the order of the rows doesn&apos;t matter.
        </p>
      </details>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span>
      <strong>{n}</strong> {label}
    </span>
  );
}

function Preview({
  preview,
  fileName,
  usable,
  importing,
  onImport,
  onCancel,
}: {
  preview: PedigreeImportPreview;
  fileName: string;
  usable: number;
  importing: boolean;
  onImport: () => void;
  onCancel: () => void;
}) {
  return (
    <section aria-labelledby="preview-heading" className="space-y-5">
      <h2 id="preview-heading" className="font-display text-2xl">
        Check {fileName}
      </h2>

      {preview.fileErrors.map((e) => (
        <FormMessage key={e} tone="error">
          {e}
        </FormMessage>
      ))}

      {preview.rows.length > 0 ? (
        <>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-lg">
            <Stat n={preview.newAncestors} label="new ancestors" />
            <Stat n={preview.yours} label="of your animals linked" />
            <Stat n={preview.recorded} label="already recorded" />
            {preview.withProblems ? (
              <strong className="text-[#8a2b1d]">{preview.withProblems} with problems (skipped)</strong>
            ) : null}
          </p>
          {preview.subjects.length ? (
            <p className="text-sm text-ink-muted">Pedigrees to fill in: {preview.subjects.join(", ")}.</p>
          ) : null}
          {preview.skippedExamples ? (
            <p className="text-sm text-ink-muted">
              Skipped {preview.skippedExamples} example {preview.skippedExamples === 1 ? "row" : "rows"} from the
              template.
            </p>
          ) : null}
          {preview.skippedUnknown ? (
            <p className="text-sm text-ink-muted">
              {preview.skippedUnknown} {preview.skippedUnknown === 1 ? "place was" : "places were"} marked unknown and
              left empty.
            </p>
          ) : null}
          {preview.unknownColumns.length ? (
            <p className="text-sm text-ink-muted">
              Ignored columns: {preview.unknownColumns.join(", ")}. Check the spelling against the template if you meant
              to use them.
            </p>
          ) : null}

          <div className="overflow-x-auto border border-rule bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-rule text-ink-muted">
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Row
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Pedigree of
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Place
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Ancestor
                  </th>
                  <th scope="col" className="px-4 py-2 font-semibold">
                    What will happen
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.line} className="border-b border-rule align-top last:border-0">
                    <td className="px-4 py-3 tabular-nums text-ink-muted">{r.line}</td>
                    <td className="px-4 py-3">{r.subject}</td>
                    <td className="px-4 py-3 text-ink-muted">{r.label || r.position}</td>
                    <td className="px-4 py-3 font-semibold">{r.name}</td>
                    <td className="px-4 py-3">
                      {r.outcome ? (
                        <>
                          <span
                            className={clsx(
                              "mr-2 inline-block px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-on-primary",
                              r.outcome === "new"
                                ? "bg-primary"
                                : r.outcome === "already"
                                  ? "bg-ink-muted"
                                  : "bg-ink",
                            )}
                          >
                            {outcomeText[r.outcome]}
                          </span>
                          {r.fills.length ? <span className="text-ink-muted">adds {r.fills.join(", ")}</span> : null}
                        </>
                      ) : null}
                      {r.errors.map((e) => (
                        <p key={e} className="font-semibold text-[#8a2b1d]">
                          {e}
                        </p>
                      ))}
                      {r.warnings.map((w) => (
                        <p key={w} className="text-[#7a5a14]">
                          {w}
                        </p>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={buttonClasses("primary")}
          onClick={onImport}
          disabled={usable === 0 || importing}
        >
          {importing ? "Importing…" : `Import ${usable} ${usable === 1 ? "ancestor" : "ancestors"}`}
        </button>
        <button type="button" className={buttonClasses("quiet")} onClick={onCancel} disabled={importing}>
          Choose a different file
        </button>
      </div>
    </section>
  );
}

function Done({ result, onAgain }: { result: PedigreeImportResult; onAgain: () => void }) {
  return (
    <section aria-labelledby="done-heading" className="space-y-5">
      <h2 id="done-heading" className="font-display text-2xl">
        Import finished
      </h2>
      <FormMessage tone={result.problems.length ? "error" : "success"}>
        {result.created} ancestors added, {result.linked} sire and dam links made
        {result.filled
          ? `, details filled in on ${result.filled} recorded ${result.filled === 1 ? "ancestor" : "ancestors"}`
          : ""}
        {result.problems.length
          ? `, ${result.problems.length} ${result.problems.length === 1 ? "problem" : "problems"}`
          : ""}
        .
      </FormMessage>
      {result.problems.length ? (
        <ul className="space-y-2 text-sm text-[#8a2b1d]">
          {result.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/animals" className={buttonClasses("primary")}>
          See your animals
        </Link>
        <button type="button" className={buttonClasses("secondary")} onClick={onAgain}>
          Import another file
        </button>
      </div>
    </section>
  );
}
