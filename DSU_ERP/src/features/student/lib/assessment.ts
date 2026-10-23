// Pure helpers for assessment screens. No browser or server APIs, so they
// render identically on the server and the client and are unit tested.

export const LEVEL_LABELS = [
  "Foundation",
  "Core application",
  "Placement standard",
  "Advanced mixed set",
  "Interview challenge",
] as const;

/** "L3 · Placement standard" for a 1-based level. */
export function levelLabel(level: number, labels: readonly string[] = LEVEL_LABELS): string {
  const name = labels[level - 1];
  return name ? `L${level} · ${name}` : `Level ${level}`;
}

export const SECTION_CAP = 30;
export const TEST_CAP = 50;
export type BlueprintSection = { name: string; count: number; type: "mcq" | "short" | "mixed" };
export type BlueprintStatus = {
  total: number;
  sourceReady: boolean;
  blueprintReady: boolean;
  launchReady: boolean;
  issues: string[];
};

/** Mirrors the server's blueprint rules plus the per-section cap of 30. */
export function blueprintStatus(input: { context: string; sections: BlueprintSection[]; duration: number }): BlueprintStatus {
  const total = input.sections.reduce((sum, section) => sum + (Number.isFinite(section.count) ? section.count : 0), 0);
  const names = input.sections.map((section) => section.name.trim().toLowerCase());
  const sourceReady = input.context.trim().length >= 10;
  const blueprint: string[] = [];
  if (!input.sections.length) blueprint.push("Add at least one section.");
  if (input.sections.some((section) => section.name.trim().length < 2)) blueprint.push("Give every section a name of two or more characters.");
  if (new Set(names).size !== names.length) blueprint.push("Use a different name for each section.");
  if (input.sections.some((section) => !Number.isInteger(section.count) || section.count < 1 || section.count > SECTION_CAP))
    blueprint.push(`Each section needs between 1 and ${SECTION_CAP} questions.`);
  if (total > TEST_CAP) blueprint.push(`Keep the whole test to ${TEST_CAP} questions or fewer.`);
  const blueprintReady = blueprint.length === 0;
  const launchReady = Number.isInteger(input.duration) && input.duration >= 5 && input.duration <= 180;
  const issues = [
    ...(sourceReady ? [] : ["Add at least a sentence of topics or job description."]),
    ...blueprint,
    ...(launchReady ? [] : ["Choose a duration between 5 and 180 minutes."]),
  ];
  return { total, sourceReady, blueprintReady, launchReady, issues };
}

export function answeredProgress(questionIds: string[], answers: Record<string, string>) {
  const answered = questionIds.filter((id) => (answers[id] || "").trim()).length;
  const total = questionIds.length;
  return { answered, total, percent: total ? Math.round((answered / total) * 100) : 0 };
}

/** Live idle readout shown during a proctored attempt. */
export function idleLabel(seconds: number): string {
  if (seconds < 5) return "Active now";
  const minutes = Math.floor(seconds / 60);
  return minutes ? `Idle ${minutes}m ${String(seconds % 60).padStart(2, "0")}s` : `Idle ${seconds}s`;
}

export function durationLabel(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "Not recorded";
  if (seconds < 60) return "Under a minute";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** Split an officer's portions text into short, distinct chips. */
export function portionChips(text: string | null | undefined): string[] {
  const seen = new Set<string>();
  const chips: string[] = [];
  for (const part of (text || "").split(/[\n,;•]+/)) {
    const chip = part.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!chip || seen.has(chip.toLowerCase())) continue;
    seen.add(chip.toLowerCase());
    chips.push(chip);
    if (chips.length === 12) break;
  }
  return chips;
}

export type Severity = "high" | "medium" | "low";
const SEVERITY: Record<string, Severity> = {
  "fullscreen-exit": "high",
  clipboard: "high",
  "tab-hidden": "medium",
  inactive: "medium",
  "window-blur": "low",
};
export const severityOf = (kind: string): Severity => SEVERITY[kind] || "low";
export const EVENT_LABELS: Record<string, string> = {
  "fullscreen-exit": "Left fullscreen",
  clipboard: "Copy, cut or paste attempt",
  "tab-hidden": "Switched tab or minimised",
  inactive: "No activity",
  "window-blur": "Window lost focus",
};
/** The server stores one event per kind within this window; repeats are dropped. */
export const INTEGRITY_REPEAT_MS = 2000;
/**
 * Per-kind throttle: a repeat of one kind is dropped, while a different kind
 * (for example a high-risk fullscreen exit after a window blur) still goes out.
 */
export function integrityThrottle(windowMs = INTEGRITY_REPEAT_MS) {
  const last = new Map<string, number>();
  return (kind: string, now: number) => {
    const previous = last.get(kind);
    if (previous !== undefined && now - previous < windowMs) return false;
    last.set(kind, now);
    return true;
  };
}
/**
 * Whether a window blur means focus really left the test: not when the tab is
 * hidden (recorded as tab-hidden), when focus came back or moved into a frame
 * of this page, or during a fullscreen change or the leave-page prompt.
 */
export function focusLeftPage(state: { hidden: boolean; hasFocus: boolean; now: number; quietUntil: number }) {
  return !state.hidden && !state.hasFocus && state.now >= state.quietUntil;
}
export function integrityCounts(events: { kind: string }[] = []) {
  const counts = { total: 0, high: 0, medium: 0, low: 0 };
  for (const event of events) {
    counts.total++;
    counts[severityOf(event.kind)]++;
  }
  return counts;
}

export function difficultyLabel(value: string | null | undefined): string {
  if (!value || value === "assigned") return "Set by placement office";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function releaseLabel(releaseAt: string | null | undefined): string {
  if (!releaseAt) return "Answers are released after the test closes.";
  const date = new Date(releaseAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  return `Answers release after ${date}.`;
}

/** Whether a written answer counts as answered (the server ignores blank text). */
export const isAnswered = (answer: string | undefined) => !!(answer || "").trim();

/** Prompt that opens student F.R.I.D.A.Y. on one AI suggestion. */
export function insightPrompt(title: string, suggestion: string, sections: string[] = []): string {
  const focus = [...new Set(sections)].slice(0, 4).join(", ");
  return `From my "${title.slice(0, 120)}" result: ${suggestion.slice(0, 400)}${focus ? ` (sections: ${focus})` : ""}. Coach me through this with practice questions, one at a time.`;
}
