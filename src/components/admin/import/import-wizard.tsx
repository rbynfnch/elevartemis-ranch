"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import clsx from "clsx";
import { commitImportAction, exportAnimalsAction, previewImportAction } from "@/lib/admin/import/actions";
import { templateCsv } from "@/lib/admin/import/template";
import type { ImportPreview, ImportResult } from "@/lib/admin/import/service";
import { FormMessage } from "@/components/admin/forms";
import { buttonClasses } from "@/components/ui/button";
import { downloadCsv } from "./download";

type Message = { tone: "error" | "success"; text: string } | null;

const today = () => new Date().toISOString().slice(0, 10);

const columnHelp: [string, string][] = [
  ["name", "Required. An animal with the same name and species is updated, not added twice."],
  ["species", "horse or cattle. Optional if the category makes it clear, or you only raise one."],
  ["category", "Stallion, Mare, Bull, Cow… as named on your site. Required for a new animal."],
  ["sex", "male, female, gelding or steer. Worked out from the category when it can be."],
  ["breed", "Added to your breed list if it's new."],
  ["color, registered_name, registry, registration_number", "Plain text."],
  [
    "sire, dam, sire_sire, sire_dam, dam_sire, dam_dam",
    "Names only: the sire, dam and the four grandparents. A name that is one of your animals is linked to it; anyone else is recorded just for the pedigree, once. For deeper pedigrees (up to seven generations) use the pedigree import.",
  ],
  ["height", "Like 15.3hh. Shown under the name on the animal's page."],
  ["tagline", "One short line under the name, up to 160 characters."],
  ["highlights", "Up to 4 short phrases (30 characters each), separated by ;  like Barrel racer; Gentle with kids."],
  ["video_url", "A link from YouTube, Vimeo, TikTok, Instagram or Facebook. Adds a Watch Video button."],
  ["birth_date", "2019, 2019-05, 2019-05-03 or 5/3/2019. Only what you enter is shown."],
  ["description", "Blank lines start new paragraphs."],
  ["status", "active, retired, reference or in memory."],
  ["published, featured", "yes or no. New animals are shown on the website unless you say no."],
  ["for_sale, price", "for_sale: none, available, pending or sold. price in dollars, like 8500."],
  ["quick_facts", "Height: 15.1 hands; Discipline: Barrel racing"],
  ["photos", "File names from your Photo Library, separated by ;. The first is the main photo."],
  ["id", "From a download. Lets you rename an animal when you upload."],
];

export function ImportWizard() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<"" | "reading" | "importing" | "exporting">("");
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
      setMessage({ tone: "error", text: "That file is too large. Split it into files of up to 500 animals." });
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
    const response = await previewImportAction(text);
    setBusy("");
    if (!response.ok) {
      setMessage({ tone: "error", text: response.message });
      return;
    }
    setFileName(file.name);
    setCsv(text);
    setPreview(response.data);
  }

  async function runImport() {
    setBusy("importing");
    setMessage(null);
    const response = await commitImportAction(csv);
    setBusy("");
    if (!response.ok) {
      setMessage({ tone: "error", text: response.message });
      return;
    }
    setResult(response.data);
    setPreview(null);
  }

  async function exportAll() {
    setBusy("exporting");
    const response = await exportAnimalsAction();
    setBusy("");
    if (!response.ok) setMessage({ tone: "error", text: response.message });
    else downloadCsv(`animals-${today()}.csv`, response.data);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void chooseFile(e.dataTransfer.files[0]);
  }

  const ready = preview ? preview.toCreate + preview.toUpdate : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={buttonClasses("secondary", "py-2")}
          onClick={() => downloadCsv("animals-template.csv", templateCsv())}
        >
          Download template (with examples)
        </button>
        <button
          type="button"
          className={buttonClasses("secondary", "py-2")}
          onClick={exportAll}
          disabled={busy === "exporting"}
        >
          {busy === "exporting" ? "Preparing…" : "Download my animals"}
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
          ready={ready}
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
          A blank cell never erases anything on an animal you&apos;re updating. Upload photos to the Photo Library
          first, then list their names in the photos column.
        </p>
      </details>
    </div>
  );
}

function Preview({
  preview,
  fileName,
  ready,
  importing,
  onImport,
  onCancel,
}: {
  preview: ImportPreview;
  fileName: string;
  ready: number;
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
          <p className="text-lg">
            <strong>{preview.toCreate}</strong> to add, <strong>{preview.toUpdate}</strong> to update
            {preview.withProblems ? (
              <>
                , <strong className="text-[#8a2b1d]">{preview.withProblems} with problems</strong> (skipped)
              </>
            ) : null}
            .
          </p>

          {preview.skippedExamples ? (
            <p className="text-sm text-ink-muted">
              Skipped {preview.skippedExamples} example {preview.skippedExamples === 1 ? "row" : "rows"} from the
              template.
            </p>
          ) : null}
          {preview.unknownColumns.length ? (
            <p className="text-sm text-ink-muted">
              Ignored columns: {preview.unknownColumns.join(", ")}. Check the spelling against the template if you meant
              to use them.
            </p>
          ) : null}
          {preview.newBreeds.length ? (
            <p className="text-sm">
              <strong>New breeds to add to your list:</strong> {preview.newBreeds.join(", ")}
            </p>
          ) : null}
          {preview.restoredBreeds.length ? (
            <p className="text-sm">
              <strong>Breeds you removed earlier, coming back:</strong> {preview.restoredBreeds.join(", ")}
            </p>
          ) : null}
          {preview.pedigree ? (
            <p className="text-sm">
              <strong>Pedigrees:</strong> {preview.pedigree.newAncestors} new ancestors, {preview.pedigree.yours} of
              your animals linked, {preview.pedigree.recorded} already recorded
              {preview.pedigree.withProblems ? (
                <span className="text-[#8a2b1d]"> and {preview.pedigree.withProblems} with problems (skipped)</span>
              ) : null}
              .
              {preview.pedigree.rows
                .filter((r) => r.errors.length || r.warnings.length)
                .map((r) => (
                  <span key={`${r.line}-${r.position}`} className="mt-1 block text-[#7a5a14]">
                    Row {r.line}, {r.subject} ({r.label.toLowerCase()}): {[...r.errors, ...r.warnings].join(" ")}
                  </span>
                ))}
            </p>
          ) : null}
          {preview.missingPhotos.length ? (
            <p className="text-sm text-[#7a5a14]">
              <strong>Photos not in your Photo Library:</strong> {preview.missingPhotos.join(", ")}. The animals import
              without them. Upload them in the{" "}
              <Link href="/admin/photos" className="underline underline-offset-4">
                Photo Library
              </Link>
              , then import again to add them.
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
                    Animal
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
                    <td className="px-4 py-3 font-semibold">{r.name}</td>
                    <td className="px-4 py-3">
                      {r.action ? (
                        <>
                          <span
                            className={clsx(
                              "mr-2 inline-block px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-on-primary",
                              r.action === "create" ? "bg-primary" : "bg-accent",
                            )}
                          >
                            {r.action === "create" ? "Add" : "Update"}
                          </span>
                          <span className="text-ink-muted">{r.sets.length ? r.sets.join(", ") : "no changes"}</span>
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
          disabled={ready === 0 || importing}
        >
          {importing ? "Importing…" : ready === 1 ? "Import 1 animal" : `Import ${ready} animals`}
        </button>
        <button type="button" className={buttonClasses("quiet")} onClick={onCancel} disabled={importing}>
          Choose a different file
        </button>
      </div>
    </section>
  );
}

function Done({ result, onAgain }: { result: ImportResult; onAgain: () => void }) {
  const problems = result.outcomes.filter((o) => o.outcome === "failed" || o.message);
  return (
    <section aria-labelledby="done-heading" className="space-y-5">
      <h2 id="done-heading" className="font-display text-2xl">
        Import finished
      </h2>
      <FormMessage tone={result.failed ? "error" : "success"}>
        {result.created} added, {result.updated} updated
        {result.failed ? `, ${result.failed} could not be saved` : ""}.
      </FormMessage>
      {result.pedigree ? (
        <FormMessage tone={result.pedigree.problems.length ? "error" : "success"}>
          Pedigrees: {result.pedigree.created} ancestors added, {result.pedigree.linked} sire and dam links made
          {result.pedigree.problems.length ? `, ${result.pedigree.problems.length} problems` : ""}.
        </FormMessage>
      ) : null}
      {result.pedigree?.problems.length ? (
        <ul className="space-y-1 text-sm text-[#8a2b1d]">
          {result.pedigree.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      {problems.length ? (
        <ul className="space-y-2 text-sm">
          {problems.map((o) => (
            <li key={o.line}>
              <strong>
                Row {o.line}, {o.name}:
              </strong>{" "}
              <span className={o.outcome === "failed" ? "text-[#8a2b1d]" : "text-[#7a5a14]"}>{o.message}</span>
            </li>
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
