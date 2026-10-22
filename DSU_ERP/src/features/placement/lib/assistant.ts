import "server-only";
import nodemailer from "nodemailer";
import { placementRead, placementMutate } from "./server";
import {
  interpret,
  validateDraft,
  safeWebUrl,
  type AssistantTool,
} from "./assistantRules";
import { text, number, type Row, type Report, type Query } from "./types";

export const diagnostics = () => ({
  database: "Connected to Supabase",
  mode: "Guided campus tools",
  web: process.env.BRAVE_API_KEY
    ? "Search provider configured"
    : "External search link available",
  email: mailConfigured()
    ? "Email provider configured"
    : "Email provider not configured",
});
function mailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_EMAIL &&
    process.env.SMTP_APP_PASSWORD
  );
}
export type AssistantAnswer = {
  text: string;
  links?: { title: string; url: string }[];
  students?: Row[];
};
export async function answer(
  message: string,
  tool: AssistantTool,
  batchSelection?: string,
): Promise<AssistantAnswer> {
  const intent = interpret(message, tool),
    q: Query = { limit: "10" };
  if (intent.batch || batchSelection) q.batch = intent.batch || batchSelection!;
  if (intent.tool === "web") {
    const search = message
      .replace(/^(search\s+(the\s+)?web\s*:?\s*)/i, "")
      .slice(0, 300);
    if (!process.env.BRAVE_API_KEY)
      return {
        text: "Web search is not connected. Open this search to explore current industry information and vacancies.",
        links: [
          {
            title: "Search the web",
            url: `https://search.brave.com/search?q=${encodeURIComponent(search)}`,
          },
        ],
      };
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.search = new URLSearchParams({
      q: search,
      count: "5",
      country: "IN",
    }).toString();
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": process.env.BRAVE_API_KEY,
      },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error("Web search is unavailable. Try again later.");
    const data = await response.json();
    const results: Array<{
      title?: string;
      url?: string;
      description?: string;
    }> = data.web?.results ?? [];
    return {
      text: results.length
        ? results
            .map(
              (r, i) =>
                `${i + 1}. ${String(r.title ?? "").replace(/<[^>]*>/g, "")}\n${String(r.description ?? "").replace(/<[^>]*>/g, "")}`,
            )
            .join("\n\n")
        : "No web results found.",
      links: results.flatMap((r) => {
        const url = safeWebUrl(r.url);
        return url
          ? [{ title: String(r.title ?? url).replace(/<[^>]*>/g, ""), url }]
          : [];
      }),
    };
  }
  if (intent.tool === "student") {
    if (!intent.search || intent.search.length > 100)
      return {
        text: "Enter a student name or USN, for example ‘Find student …’.",
      };
    const data = await placementRead<Report>("students", {
      ...q,
      search: intent.search,
    });
    return {
      text: data.rows.length
        ? `${data.pagination.total} matching students. Showing ${data.rows.length}.\n\n` +
          data.rows
            .map(
              (s) =>
                `${s.name} · ${s.usn}\n${text(s.department)} · Batch ${text(s.batch)} · CGPA ${text(s.cgpa)} · SGPA ${text(s.sgpa)}\nBacklogs: ${text(s.backlogs)} · Attendance: ${text(s.attendance)}%`,
            )
            .join("\n\n")
        : "No students match that name or USN.",
      students: data.rows,
      links: data.rows.map((s) => ({
        title: `Open ${s.name}’s journey`,
        url: `/placement/students/${s.id}`,
      })),
    };
  }
  if (intent.tool === "batch" || intent.tool === "placement") {
    const resource = intent.tool === "batch" ? "batch" : "overview";
    const data = await placementRead<Report>(resource, q),
      summary = data.summary ?? {};
    return {
      text:
        `${q.batch ? `Batch ${q.batch}` : "All batches"}\n` +
        Object.entries(summary)
          .map(([k, v]) => `${k.replaceAll("_", " ")}: ${number(v, 2)}`)
          .join("\n") +
        (resource === "batch"
          ? `\n\nBaseline eligibility: ${data.options.policy.label}.`
          : "\n\nPackage statistics are in LPA and use active offers."),
      links: [
        {
          title: "Open full report",
          url: `/placement/${resource}${q.batch ? `?batch=${q.batch}` : ""}`,
        },
      ],
    };
  }
  if (intent.tool === "candidates") {
    const data = await placementRead<Report>("ranking", {
      ...q,
      limit: "20",
      ...(intent.minimum
        ? { minimum: intent.minimum }
        : { eligibility: "eligible" }),
    });
    return {
      text:
        `${data.pagination.total} matching students. Showing the top ${data.rows.length} by stored CGPA.\n\n` +
        data.rows
          .map(
            (s) =>
              `${s.college_rank}. ${s.name} · ${s.usn} · ${text(s.department)} · CGPA ${s.cgpa}`,
          )
          .join("\n"),
      students: data.rows,
      links: data.rows.map((s) => ({
        title: `Open ${text(s.name)}’s profile`,
        url: `/placement/students/${s.id}`,
      })),
    };
  }
  const resource =
    intent.tool === "drives"
      ? "drives"
      : intent.tool === "tests"
        ? "tests"
        : "talent";
  const data = await placementRead<Report>(resource, {
    ...q,
    ...(resource === "talent"
      ? {
          // The read API accepts searches of at most 100 characters.
          search: message
            .replace(
              /^(find|show|search)\s+(talent|skills|candidates|career)?\s*:?\s*/i,
              "",
            )
            .slice(0, 100),
        }
      : {}),
  });
  if (resource === "drives")
    return {
      text: data.rows.length
        ? data.rows
            .map(
              (d) =>
                `${d.company} — ${d.title}\n${d.package_lpa} LPA · ${d.status} · ${text(d.drive_date)} · Batch ${d.batch}`,
            )
            .join("\n\n")
        : "No drives have been recorded for this selection.",
      links: data.rows.map((d) => ({
        title: String(d.title),
        url: `/placement/drives/${d.id}`,
      })),
    };
  return {
    text:
      resource === "tests"
        ? `${data.pagination.total} students with recorded completed assessments.\n` +
          data.rows
            .map(
              (s) =>
                `${s.name} · ${s.usn} · Combined score ${text(s.combined_score)} · ${text(s.classification)}`,
            )
            .join("\n")
        : `${data.pagination.total} matching students; ${number(data.summary?.predictions)} recorded predictions.\n` +
          data.rows
            .map(
              (s) =>
                `${s.name} · ${s.usn} · ${s.prediction_id ? `${text(s.readiness)} · ${Array.isArray(s.roles) ? s.roles.join(", ") : ""}` : "No recorded prediction"}`,
            )
            .join("\n"),
    links:
      resource === "tests"
        ? [{ title: "Open detailed report", url: "/placement/tests" }]
        : data.rows.map((s) => ({
            title: `Open ${text(s.name)}’s profile`,
            url: `/placement/students/${s.id}`,
          })),
  };
}
async function recipient(studentId: string) {
  const student = await placementRead<Row>("student", { id: studentId });
  const contact = student.contact as Row | null;
  const email = contact?.email;
  if (
    typeof email !== "string" ||
    !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email)
  )
    throw new Error("This student has no valid email address on record.");
  return { name: String(student.name), email };
}
export async function proposeEmail(input: unknown, requestId: string) {
  const draft = validateDraft(input),
    to = await recipient(draft.student_id);
  const proposal = await placementMutate<Row>(
    "proposal.create",
    { kind: "email", payload: { ...draft, recipient_email: to.email } },
    requestId,
  );
  return {
    id: proposal.id,
    ...draft,
    to: to.email,
    name: to.name,
    canSend: mailConfigured(),
  };
}
export async function confirmEmail(id: string) {
  if (!mailConfigured())
    throw new Error(
      "Email delivery is not configured. The draft has not been sent.",
    );
  // A fresh claim key deliberately prevents a retry from replaying a successful claim.
  // The database consumes the proposal once, even across concurrent web instances.
  const proposal = await placementMutate<Row>(
    "proposal.claim",
    { id },
    crypto.randomUUID(),
  );
  try {
    if (proposal.kind !== "email") throw new Error("Unsupported action.");
    const draft = validateDraft(proposal.payload),
      to = await recipient(draft.student_id);
    if (to.email !== (proposal.payload as Row).recipient_email)
      throw new Error(
        "The recorded email changed. Create and review a new draft.",
      );
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      requireTLS: true,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_APP_PASSWORD,
      },
      tls: { rejectUnauthorized: true },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
      logger: false,
      debug: false,
    });
    const info = await transport.sendMail({
      from: process.env.SMTP_EMAIL,
      to: to.email,
      subject: draft.subject,
      text: draft.body,
      messageId: `<placement-${id}@${process.env.SMTP_EMAIL!.split("@")[1]}>`,
    });
    if (!info.accepted?.length)
      throw new Error("Email provider did not accept the message.");
    await placementMutate(
      "proposal.finish",
      { id, success: true },
      crypto.randomUUID(),
    );
    return { message: "The email provider accepted the message for delivery." };
  } catch {
    await placementMutate(
      "proposal.finish",
      { id, success: false },
      crypto.randomUUID(),
    ).catch(() => {});
    throw new Error(
      "Delivery could not be confirmed. Check your sent mail before creating another draft; this action will not retry automatically.",
    );
  }
}
