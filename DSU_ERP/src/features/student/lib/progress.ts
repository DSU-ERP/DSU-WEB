// Pure helpers for student-facing progress labels. No browser or server APIs,
// so they render identically on the server and the client and are unit tested.

/** Today's date in campus time (Asia/Kolkata) as YYYY-MM-DD. */
export function campusToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** Whole days from `today` to a YYYY-MM-DD date (negative when past). */
export function daysUntil(date: string, today = campusToday()): number {
  const at = (value: string) => Date.UTC(+value.slice(0, 4), +value.slice(5, 7) - 1, +value.slice(8, 10));
  return Math.round((at(date.slice(0, 10)) - at(today)) / 86400000);
}

export type Tone = "good" | "warn" | "bad" | "neutral";

export function deadlineLabel(date: string | null | undefined, today = campusToday()): { text: string; tone: Tone; open: boolean } {
  if (!date) return { text: "No deadline published", tone: "neutral", open: true };
  const days = daysUntil(date, today);
  if (days < 0) return { text: "Registration closed", tone: "neutral", open: false };
  if (days === 0) return { text: "Closes today", tone: "bad", open: true };
  if (days === 1) return { text: "Closes tomorrow", tone: "bad", open: true };
  if (days <= 7) return { text: `${days} days left`, tone: "warn", open: true };
  return { text: `${days} days left`, tone: "neutral", open: true };
}

// Same stored-decimal rules as the backend: Advanced ≥ 8.50, Medium ≥ 6.75,
// Needs improvement below; 6.75 is the baseline placement eligibility.
export const PLACEMENT_BASELINE = 6.75;
export function academicStanding(cgpa: string | number | null | undefined): {
  value: string; band: string; eligible: boolean | null; note: string; tone: Tone;
} {
  const text = cgpa === null || cgpa === undefined ? "" : String(cgpa).trim();
  const score = text === "" ? NaN : Number(text);
  if (!Number.isFinite(score) || score < 0 || score > 10)
    return { value: "Not recorded", band: "Unclassified", eligible: null, note: "No official CGPA on record yet", tone: "neutral" };
  const band = score >= 8.5 ? "Advanced" : score >= PLACEMENT_BASELINE ? "Medium" : "Needs improvement";
  const eligible = score >= PLACEMENT_BASELINE;
  const gap = Math.round((PLACEMENT_BASELINE - score) * 100) / 100;
  return {
    value: text,
    band,
    eligible,
    note: eligible ? `${band} · meets the ${PLACEMENT_BASELINE} placement baseline` : `${band} · ${gap.toFixed(2)} below the ${PLACEMENT_BASELINE} placement baseline`,
    tone: band === "Advanced" ? "good" : eligible ? "neutral" : "warn",
  };
}

export type ReadinessStep = { key: string; title: string; done: boolean; href: string; hint: string };
export function readinessChecklist(input: {
  onboarded: boolean; resume: boolean; sessions: number; assessments: number; applications: number;
}): { steps: ReadinessStep[]; done: number; percent: number } {
  const steps: ReadinessStep[] = [
    { key: "profile", title: "Complete your profile", done: input.onboarded, href: "/student/settings", hint: "Interests, goals and links recruiters look for." },
    { key: "resume", title: "Analyse your resume", done: input.resume, href: "/student/resume", hint: "Get a role-fit report and fix gaps early." },
    { key: "interview", title: "Finish one AI interview", done: input.sessions > 0, href: "/student/interview?new=1", hint: "Sets your communication and confidence baseline." },
    { key: "assessment", title: "Complete one assessment", done: input.assessments > 0, href: "/student/ai-mock-test", hint: "Aptitude and technical practice with instant results." },
    { key: "apply", title: "Apply to a drive", done: input.applications > 0, href: "/student/placement", hint: "Register for an eligible published opportunity." },
  ];
  const done = steps.filter((step) => step.done).length;
  return { steps, done, percent: Math.round((done / steps.length) * 100) };
}

/** Where an application stands in the drive's ordered rounds (current_round is 1-based). */
export function applicationStage(
  application: { status: string; current_round: number } | null,
  rounds: string[],
): { label: string; step: number; total: number; finished: boolean } | null {
  if (!application) return null;
  const total = rounds.length;
  const step = Math.max(1, Math.min(total || 1, Math.trunc(application.current_round || 1)));
  const status = application.status;
  if (status === "selected" || status === "placed")
    return { label: status === "placed" ? "Placed" : "Selected", step: total, total, finished: true };
  if (status === "rejected") return { label: `Not selected in round ${step}`, step, total, finished: true };
  if (status === "withdrawn") return { label: "Withdrawn", step, total, finished: true };
  const round = rounds[step - 1];
  return {
    label: total ? `Round ${step} of ${total}${round ? `: ${round}` : ""}${status === "registered" && step === 1 ? " (upcoming)" : ""}` : "Registered",
    step, total, finished: false,
  };
}

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Word count for answer guidance. */
export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/** "in-progress" → "In progress" for status labels shown to students. */
export const statusText = (status: string) =>
  status ? status[0].toUpperCase() + status.slice(1).replace(/-/g, " ") : "";

export type ActivityDay = { day: string; count: number };
/**
 * A fixed window of campus days ending today (oldest first). Days without
 * recorded activity are zero, never estimated.
 */
export function activitySeries(activity: ActivityDay[] | undefined, today = campusToday(), days = 14): ActivityDay[] {
  const counts = new Map<string, number>();
  for (const row of activity || []) {
    const count = Number(row.count);
    if (Number.isFinite(count) && count > 0) counts.set(String(row.day).slice(0, 10), Math.trunc(count));
  }
  const end = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(end - (days - 1 - index) * 86400000).toISOString().slice(0, 10);
    return { day, count: counts.get(day) ?? 0 };
  });
}
