"use client";

import { templateCsv } from "@/lib/admin/import/template";
import { buttonClasses } from "@/components/ui/button";
import { downloadCsv } from "./download";

/** Downloads a blank spreadsheet with the right columns and two example rows. */
export function TemplateButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={buttonClasses("secondary", className)}
      onClick={() => downloadCsv("animals-template.csv", templateCsv())}
    >
      CSV template
    </button>
  );
}
