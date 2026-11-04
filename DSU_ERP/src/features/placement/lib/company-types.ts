// Shapes returned by the company-portal endpoints (officer side).
export type RequestStatus = "draft" | "submitted" | "returned" | "approved" | "rejected";
export type Criteria = {
  batches?: string[];
  branches?: string[];
  min_cgpa?: number;
  max_backlogs?: number;
  min_attendance?: number;
  notes?: string;
};
export type DriveRequestRow = {
  id: string;
  kind: "new" | "change";
  status: RequestStatus;
  title: string | null;
  company: string;
  companyId: string;
  packageLpa: number | null;
  employmentType: string | null;
  openings: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  driveId: string | null;
  batches: string[] | null;
};
export type DriveRequestList = {
  counts: Record<"submitted" | "returned" | "approved" | "rejected", number>;
  rows: DriveRequestRow[];
};
export type RequestFields = {
  title: string | null;
  description: string;
  job_category: string | null;
  employment_type: string | null;
  openings: number | null;
  package_lpa: number | null;
  ctc_fixed_lpa: number | null;
  ctc_variable_lpa: number | null;
  stipend_monthly: number | null;
  internship_months: number | null;
  bond_months: number | null;
  bond_details: string | null;
  work_mode: string | null;
  joining_date: string | null;
  location: string | null;
  skills: string;
  required_documents: string;
  rounds: string[];
  drive_date: string | null;
  registration_deadline: string | null;
  criteria: Criteria;
};
export type DriveRequest = RequestFields & {
  id: string;
  kind: "new" | "change";
  status: RequestStatus;
  revision: number;
  drive_id: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
  jd_file: { id: string; filename: string; size: number } | null;
  drive: { id: string; title: string; status: string; published: boolean } | null;
  company: { id: string; name: string; industry: string | null; website: string | null; about: string | null; headquarters: string | null };
  submittedBy: { email: string; name: string | null } | null;
  live: (Record<string, unknown> & { id: string }) | null;
  options: { batches: string[]; departments: string[] };
};
export type AudienceSpec = {
  /** "selected": only the students in `add` receive the drive; filters are ignored. */
  mode?: "rules" | "selected";
  batches: string[];
  branches: string[];
  min_cgpa?: number | "";
  max_backlogs?: number | "";
  min_attendance?: number | "";
  add: string[];
  remove: string[];
};
export type AudienceStudent = {
  id: string;
  usn: string;
  name: string;
  department: string | null;
  batch: string;
  cgpa: string | null;
  backlogs: number | null;
  source?: "rules" | "added";
  dsa: number | null;
  github: number | null;
  developer: number | null;
};
export type AudiencePreview = {
  total: number;
  added: number;
  removed: number;
  matching: number;
  byDepartment: { department: string; students: number }[];
  byBatch: { batch: string; students: number }[];
  rows: AudienceStudent[];
  page: number;
  limit: number;
};
export type AudienceState = {
  audienceMode: boolean;
  origin: "officer" | "company";
  released: boolean;
  releasedAt: string | null;
  consenting: number;
  size: number;
  rules: { batches: string[]; branches: string[]; min_cgpa: number | null; max_backlogs: number | null; min_attendance: number | null; selected_only?: boolean } | null;
  changes: { add: string[]; remove: string[] } | null;
  hasPortal: boolean;
  options: { batches: string[]; departments: string[] };
};
export type CompanyAccess = {
  members: { userId: string; email: string; name: string | null; active: boolean; since: string; revokedAt: string | null }[];
  invites: { id: string; email: string; name: string | null; createdAt: string; expiresAt: string; state: "pending" | "accepted" | "expired" | "revoked" }[];
};
export const STATUS_LABEL: Record<RequestStatus, string> = {
  draft: "Draft",
  submitted: "Awaiting review",
  returned: "Returned for changes",
  approved: "Approved",
  rejected: "Not approved",
};
export const EMPLOYMENT_LABEL: Record<string, string> = {
  "full-time": "Full-time",
  internship: "Internship",
  "internship-ppo": "Internship with PPO",
  contract: "Contract",
};
export const WORK_MODE_LABEL: Record<string, string> = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" };
