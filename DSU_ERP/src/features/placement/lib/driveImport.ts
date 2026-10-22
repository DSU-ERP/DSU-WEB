// Turns drive-PDF suggestions into editor defaults. Pure, so it is unit tested.
// Values that cannot be matched to campus records are reported, never forced.

export type DriveImportFields = {
  company_name: string;
  title: string;
  package_lpa: number | null;
  location: string;
  drive_date: string;
  registration_deadline: string;
  min_cgpa: number | null;
  max_backlogs: number | null;
  branches: string[];
  skills: string;
  description: string;
  rounds: string[];
  required_documents: string;
  job_category: string;
  employment_type: string;
  openings: number | null;
  contact: string;
};
export type DriveImportResult = {
  intakeId: string;
  fields: DriveImportFields;
  missingFields: string[];
  warnings: string[];
  document: { filename: string; pageCount: number | null; chars: number; truncated: boolean; lowText: boolean; stored: string };
  text: string;
};
export const FIELD_LABELS: Record<string, string> = {
  company_name: "Company",
  title: "Job role",
  package_lpa: "Salary package (LPA)",
  location: "Location",
  drive_date: "Drive date",
  registration_deadline: "Registration deadline",
  min_cgpa: "Minimum CGPA",
  max_backlogs: "Maximum backlogs",
  branches: "Permitted branches",
  skills: "Required skills",
  description: "Description",
  rounds: "Recruitment rounds",
  required_documents: "Required documents",
  job_category: "Job category",
  employment_type: "Employment type",
  openings: "Openings",
  contact: "Contact",
};

type Company = { id?: unknown; name?: unknown; short_name?: unknown };
const key = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function driveImportDefaults(
  fields: DriveImportFields,
  companies: Company[],
  departments: string[],
): { prefill: Record<string, string | number | string[]>; notes: string[] } {
  const notes: string[] = [];
  const prefill: Record<string, string | number | string[]> = {};
  const wanted = key(fields.company_name);
  const company = wanted
    ? companies.find((c) => c.id && (key(c.name) === wanted || (c.short_name && key(c.short_name) === wanted)))
    : undefined;
  if (company) prefill.company_id = String(company.id);
  else if (fields.company_name)
    notes.push(`“${fields.company_name}” is not in your active company list. Add the company first or choose it below.`);
  const text = ["title", "location", "skills", "description", "required_documents", "job_category", "drive_date", "registration_deadline", "employment_type"] as const;
  for (const name of text) if (fields[name]) prefill[name] = fields[name];
  for (const name of ["package_lpa", "min_cgpa", "max_backlogs", "openings"] as const)
    if (fields[name] !== null && fields[name] !== undefined) prefill[name] = fields[name] as number;
  if (fields.rounds.length) prefill.rounds = fields.rounds;
  const available = new Map(departments.filter((d) => d !== "__missing__").map((d) => [key(d), d]));
  const matched: string[] = [],
    unmatched: string[] = [];
  for (const branch of fields.branches) {
    const found = available.get(key(branch));
    if (found) matched.push(found);
    else unmatched.push(branch);
  }
  if (matched.length) prefill.branches = [...new Set(matched)];
  if (unmatched.length)
    notes.push(`Branches not found in campus records: ${unmatched.join(", ")}. Select the matching departments manually.`);
  if (fields.contact) notes.push(`Contact in the PDF: ${fields.contact}. Drives have no contact field; update the company record if needed.`);
  return { prefill, notes };
}
