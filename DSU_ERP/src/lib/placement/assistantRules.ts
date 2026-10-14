export const ASSISTANT_TOOLS = [
  "auto",
  "student",
  "batch",
  "candidates",
  "drives",
  "placement",
  "tests",
  "talent",
  "web",
] as const;
export type AssistantTool = (typeof ASSISTANT_TOOLS)[number];
export function interpret(message: string, selected: AssistantTool = "auto") {
  const batch = message.match(/\b20\d{2}\b/)?.[0];
  let tool = selected;
  if (tool === "auto") {
    if (/\b(web|jobs?|industry|hiring|internet)\b/i.test(message)) tool = "web";
    else if (/\b(drives?|recruitment)\b/i.test(message)) tool = "drives";
    else if (/\b(tests?|assessment|tier)\b/i.test(message)) tool = "tests";
    else if (/\b(skills?|talent|career|prediction)\b/i.test(message))
      tool = "talent";
    else if (/\b(placed|offers?|placement|package)\b/i.test(message))
      tool = "placement";
    else if (/\b(cgpa|candidates?|rank|eligible)\b/i.test(message))
      tool = "candidates";
    else if (/\b(batch|cohort|summary)\b/i.test(message)) tool = "batch";
    else tool = "student";
  }
  const search = message
    .replace(
      /^(please\s+)?(find|search|look up|lookup|show)(\s+(for|me|student|students|profile|of))*\s*:?\s*/i,
      "",
    )
    .trim();
  const minimum = message.match(
    /(?:cgpa\s*(?:>=|≥|above|at least|over)?\s*)(\d+(?:\.\d+)?)/i,
  )?.[1];
  return { tool, batch, search, minimum };
}
export function validateDraft(value: unknown): {
  student_id: string;
  subject: string;
  body: string;
} {
  if (!value || typeof value !== "object")
    throw new Error("Complete the email draft.");
  const p = value as Record<string, unknown>;
  if (
    typeof p.student_id !== "string" ||
    !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(p.student_id)
  )
    throw new Error("Choose a student from the search results.");
  if (
    typeof p.subject !== "string" ||
    !p.subject.trim() ||
    p.subject.length > 180 ||
    /[\r\n]/.test(p.subject)
  )
    throw new Error("Enter a subject of up to 180 characters.");
  if (typeof p.body !== "string" || !p.body.trim() || p.body.length > 10000)
    throw new Error("Enter a message of up to 10,000 characters.");
  return {
    student_id: p.student_id,
    subject: p.subject.trim(),
    body: p.body.trim(),
  };
}
export function safeWebUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value));
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
