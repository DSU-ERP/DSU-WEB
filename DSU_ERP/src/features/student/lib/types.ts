export type OfficialStudent = {
  id: string;
  enrollment_no: string;
  full_name: string;
  course_name: string | null;
  department_name: string | null;
  department_short_name: string | null;
  current_semester: string | null;
  source_batch: string;
  cgpa: string | null;
  attendance: string | null;
  current_backlog: number | null;
  sgpa: string | null;
};
export type ProfileDetails = {
  fullName: string;
  phone: string;
  city: string;
  university: string;
  campus: string;
  school: string;
  department: string;
  program: string;
  specialization: string;
  semester: string;
  graduationYear: string;
  dreamRoles: string;
  bio: string;
  attendanceGoal: number;
  goals: string[];
  voiceStyle: "confident" | "mentor" | "fast";
  focus: string;
  linkedin: string;
  portfolio: string;
  platform: string;
  placementProfile: string;
  certifications: string;
  notifications: boolean;
  github: string;
  interests: string[];
  skills: string;
  internshipPreference: string;
};
export type ProfileState = {
  official: OfficialStudent;
  details: Partial<ProfileDetails>;
  onboarded: boolean;
  revision: number;
};
export type Notice = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};
export const STUDENT_MODULES = [
  {
    href: "/student/dashboard",
    label: "Dashboard",
    purpose: "Your next useful step",
    group: "Workspace",
    icon: "dashboard",
  },
  {
    href: "/student/readiness",
    label: "Readiness",
    purpose: "Understand your preparation",
    group: "Workspace",
    icon: "chart",
  },
  {
    href: "/student/observation-haki",
    label: "Observation Haki",
    purpose: "Your career thinking partner",
    group: "Workspace",
    icon: "chat",
  },
  {
    href: "/student/interview",
    label: "AI Interview",
    purpose: "Practise, reflect, improve",
    group: "Workspace",
    icon: "mic",
  },
  {
    href: "/student/ai-mock-test",
    label: "AI Mock Test",
    purpose: "Build a focused practice test",
    group: "Workspace",
    icon: "spark",
  },
  {
    href: "/student/assessments",
    label: "Assessments",
    purpose: "Six categories, five levels",
    group: "Workspace",
    icon: "check",
  },
  {
    href: "/student/assessments/faculty-test",
    label: "Assigned tests",
    purpose: "Enter your six-digit class code",
    group: "Workspace",
    icon: "lock",
  },
  {
    href: "/student/resume",
    label: "Career Report",
    purpose: "Turn your experience into a plan",
    group: "Placement kit",
    icon: "file",
  },
  {
    href: "/student/placement",
    label: "Placement",
    purpose: "Find your next opportunity",
    group: "Placement kit",
    icon: "briefcase",
  },
  {
    href: "/student/timetable",
    label: "Timetable",
    purpose: "Make room for what matters",
    group: "Campus",
    icon: "calendar",
  },
  {
    href: "/student/settings",
    label: "Settings",
    purpose: "Your profile and preferences",
    group: "Account",
    icon: "settings",
  },
] as const;
