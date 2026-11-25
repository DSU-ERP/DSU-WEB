"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { DriveEditor } from "./DriveEditor";
import { text, type Report, type Row } from "@/features/placement/lib/types";
import { driveFromCompanyDefaults } from "@/features/placement/lib/driveImport";

type Applied = { companyId: string; prefill: Row; notes: string[]; filled: number };

/**
 * New-drive form. Choosing a company fills the form from that company's saved
 * drive details (set on its company page, by hand or from a recruiter PDF).
 * Batch, academic year, drive date and registration deadline stay empty for
 * the officer, and nothing is saved or published until they press Save.
 */
export function DriveCreator({
  companies,
  options,
  defaultCompany,
}: {
  companies: Row[];
  options: Report["options"];
  defaultCompany?: string;
}) {
  const departments = Array.isArray(options.departments) ? options.departments : [];
  const fill = (companyId: string): Applied => {
    const company = companies.find((c) => c.id === companyId);
    return { companyId, ...driveFromCompanyDefaults(companyId, company?.drive_defaults, departments) };
  };
  const [applied, setApplied] = useState<Applied | null>(() => (defaultCompany ? fill(defaultCompany) : null));
  const [version, setVersion] = useState(0);
  // Set when the officer types or clicks in the form, so choosing another
  // company never silently replaces their work.
  const edited = useRef(false);

  const chooseCompany = (companyId: string) => {
    if (!companyId) return;
    const next = fill(companyId);
    if (!next.filled) {
      // Nothing saved for this company: keep what is in the form.
      setApplied({ ...next, prefill: { ...(applied?.prefill ?? {}), company_id: companyId } });
      return;
    }
    if (
      edited.current &&
      !window.confirm("Fill the drive form with this company's saved drive details? What you typed will be replaced.")
    ) {
      setApplied((current) => current && { ...current, companyId });
      return;
    }
    setApplied(next);
    setVersion((v) => v + 1);
    edited.current = false;
  };

  const company = applied ? companies.find((c) => c.id === applied.companyId) : undefined;
  return (
    <section
      className="erp-panel"
      onInputCapture={(e) => {
        if ((e.target as HTMLElement).getAttribute("name") !== "company_id") edited.current = true;
      }}
      onClickCapture={(e) => {
        // Round editor buttons (add, move, remove) change the form without typing.
        if ((e.target as HTMLElement).closest("button")) edited.current = true;
      }}
    >
      {applied && company && (
        <div className="po-drive-prefill" role="status">
          {applied.filled ? (
            <p className="po-note">
              Filled from {text(company.name)}’s saved drive details. Add the passing-out batch, academic year, drive date
              and registration deadline, check the rest, then save. Publishing stays off until you tick it.
            </p>
          ) : (
            <p className="erp-muted">
              {text(company.name)} has no saved drive details yet.{" "}
              <Link href={`/placement/companies/${applied.companyId}`}>Add them on the company page</Link>, from a recruiter
              PDF or by hand, so future drives fill in automatically.
            </p>
          )}
          {!!applied.notes.length && (
            <ul className="po-import-warnings">
              {applied.notes.map((note, index) => (
                <li key={index}>
                  <TriangleAlert size={13} aria-hidden="true" /> {note}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <DriveEditor
        key={version}
        companies={companies}
        options={options}
        defaultCompany={applied?.companyId ?? defaultCompany}
        prefill={applied?.prefill}
        onCompanyChange={chooseCompany}
      />
    </section>
  );
}
