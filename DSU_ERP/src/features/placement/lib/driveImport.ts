// Recruiter-PDF suggestions and company drive defaults. Pure, so it is unit tested.
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
export type CompanyImportFields = {
  name: string;
  short_name: string;
  industry: string;
  headquarters: string;
  website: string;
  hr_name: string;
  hr_email: string;
  hr_phone: string;
  about: string;
  hiring_roles: string;
  job_categories: string[];
};
export type DriveImportResult = {
  intakeId: string;
  fields: DriveImportFields;
  missingFields: string[];
  /** Absent from backends that predate company extraction. */
  company?: CompanyImportFields;
  missingCompanyFields?: string[];
  warnings: string[];
  /** The PDF line each value was read from (rule-based reading). */
  sources?: Record<string, string>;
  method?: "rules";
  document: { filename: string; pageCount: number | null; chars: number; truncated: boolean; lowText: boolean; stored: string };
  text: string;
};

export const COMPANY_FIELD_LABELS: Record<keyof CompanyImportFields, string> = {
  name: "Company name",
  short_name: "Short name",
  industry: "Industry",
  headquarters: "Headquarters / location",
  website: "Website",
  hr_name: "HR contact name",
  hr_email: "HR email",
  hr_phone: "HR phone",
  about: "About the company",
  hiring_roles: "Roles they hire for",
  job_categories: "Job categories",
};

/** Role details a company keeps for its drives. Dates, batch and status are per drive. */
export const DRIVE_DEFAULT_LABELS = {
  title: "Job role",
  job_category: "Job category",
  employment_type: "Employment type",
  openings: "Openings",
  package_lpa: "Salary package (LPA)",
  location: "Location",
  min_cgpa: "Minimum CGPA",
  max_backlogs: "Maximum current backlogs",
  min_attendance: "Minimum attendance %",
  branches: "Permitted branches",
  skills: "Required skills",
  required_documents: "Required documents",
  description: "Description",
  rounds: "Selection rounds",
} as const;
export type DriveDefaultKey = keyof typeof DRIVE_DEFAULT_LABELS;
export type DriveDefaults = Partial<Record<DriveDefaultKey, string | number | string[]>>;
export const DRIVE_DEFAULT_KEYS = Object.keys(DRIVE_DEFAULT_LABELS) as DriveDefaultKey[];

const present = (value: unknown) =>
  value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && !value.length);

/** The role details in a recruiter PDF, as company drive defaults. Dates are left out on purpose. */
export function driveDefaultsFromImport(fields: DriveImportFields): DriveDefaults {
  const defaults: DriveDefaults = {};
  for (const key of DRIVE_DEFAULT_KEYS) {
    const value = (fields as Partial<Record<DriveDefaultKey, unknown>>)[key];
    if (present(value)) defaults[key] = value as string | number | string[];
  }
  return defaults;
}

/** Keeps only known, non-empty default keys from a stored company record. */
export function readDriveDefaults(value: unknown): DriveDefaults {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const defaults: DriveDefaults = {};
  for (const key of DRIVE_DEFAULT_KEYS) {
    const item = (value as Record<string, unknown>)[key];
    if (Array.isArray(item)) {
      const list = item.map(String).filter(Boolean);
      if (list.length) defaults[key] = list;
    } else if (typeof item === "number" && Number.isFinite(item)) defaults[key] = item;
    else if (typeof item === "string" && item.trim()) defaults[key] = item.trim();
  }
  return defaults;
}

const key = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * A new drive's form values from a company's saved defaults. Batch, academic
 * year, drive date, registration deadline and publishing stay for the officer.
 */
export function driveFromCompanyDefaults(
  companyId: string,
  stored: unknown,
  departments: string[],
): { prefill: Record<string, string | number | string[]>; notes: string[]; filled: number } {
  const defaults = readDriveDefaults(stored);
  const prefill: Record<string, string | number | string[]> = { company_id: companyId };
  const notes: string[] = [];
  let filled = 0;
  for (const name of DRIVE_DEFAULT_KEYS) {
    if (name === "branches" || defaults[name] === undefined) continue;
    prefill[name] = defaults[name] as string | number | string[];
    filled++;
  }
  const branches = Array.isArray(defaults.branches) ? defaults.branches : [];
  if (branches.length) {
    const available = new Map(departments.filter((d) => d !== "__missing__").map((d) => [key(d), d]));
    const matched: string[] = [],
      unmatched: string[] = [];
    for (const branch of branches) {
      const found = available.get(key(branch));
      if (found) matched.push(found);
      else unmatched.push(branch);
    }
    if (matched.length) {
      prefill.branches = [...new Set(matched)];
      filled++;
    }
    if (unmatched.length)
      notes.push(`Branches not found in campus records: ${unmatched.join(", ")}. Select the matching departments manually.`);
  }
  return { prefill, notes, filled };
}
