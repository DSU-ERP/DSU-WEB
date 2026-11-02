import type { Criteria, RequestFields, RequestStatus } from "@/features/placement/lib/company-types";
export type { Criteria, RequestFields, RequestStatus };

export type CompanySession = {
  company: {
    id: string;
    name: string;
    shortName: string | null;
    industry: string | null;
    website: string | null;
    about: string | null;
    headquarters: string | null;
    hrName: string | null;
    hrEmail: string | null;
  };
  member: { email: string; name: string | null; since: string } | null;
};
export type CompanyRequest = RequestFields & {
  id: string;
  kind: "new" | "change";
  status: RequestStatus;
  revision: number;
  drive_id: string | null;
  jd_file_id: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  updated_at: string;
  jd_file: { id: string; filename: string; size: number } | null;
  drive: { id: string; title: string; status: string; published: boolean } | null;
};
export type CompanyDrive = {
  id: string;
  title: string;
  description: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  origin: "officer" | "company";
  jobCategory: string | null;
  employmentType: string | null;
  openings: number | null;
  packageLpa: number;
  ctcFixedLpa: number | null;
  ctcVariableLpa: number | null;
  stipendMonthly: number | null;
  internshipMonths: number | null;
  bondMonths: number | null;
  bondDetails: string | null;
  workMode: string | null;
  joiningDate: string | null;
  location: string | null;
  skills: string;
  requiredDocuments: string;
  rounds: string[];
  driveDate: string | null;
  registrationDeadline: string | null;
  released: boolean;
  releasedAt: string | null;
  jdFile: { id: string; filename: string; size: number } | null;
  applicants: number | null;
  selected: number | null;
  openChange: { id: string; status: RequestStatus } | null;
};
export type Applicant = {
  registrationId: string;
  status: "registered" | "in-progress" | "selected" | "rejected" | "withdrawn" | "placed";
  currentRound: number;
  appliedAt: string;
  usn: string;
  name: string;
  branch: string | null;
  department: string | null;
  batch: string;
  cgpa: string | null;
  backlogs: number | null;
  email: string | null;
  phone: string | null;
  resume: { id: string; filename: string } | null;
  results: { round: number; name: string; result: "pass" | "fail" | "absent"; remarks: string }[];
};
export type Applicants = { released: boolean; releasedAt?: string; rounds: string[]; rows: Applicant[] };

export const DRIVE_STATUS: Record<CompanyDrive["status"], string> = {
  upcoming: "Upcoming",
  ongoing: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const APPLICANT_STATUS: Record<Applicant["status"], string> = {
  registered: "Applied",
  "in-progress": "In progress",
  selected: "Selected",
  rejected: "Not selected",
  withdrawn: "Withdrew",
  placed: "Offer made",
};
