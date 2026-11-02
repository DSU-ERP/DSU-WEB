"use server";
import nodemailer from "nodemailer";
import { revalidatePath } from "next/cache";
import { backendApi } from "@/shared/http/backend";
import { CampusError } from "@/shared/http/errors";
import { siteOrigin } from "@/shared/config/site";
import { officerSession } from "@/features/placement/lib/server";
import type { AudiencePreview, AudienceSpec, AudienceStudent } from "@/features/placement/lib/company-types";

// Officer actions for company drive requests, audiences and portal access.
// The backend re-checks the officer for every call.
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function post<T>(path: string, body: unknown): Promise<ActionResult<T>> {
  try {
    await officerSession();
    return { ok: true, data: (await backendApi<{ data: T }>(path, { method: "POST", body: JSON.stringify(body) })).data };
  } catch (error) {
    return { ok: false, error: error instanceof CampusError ? error.message : "The change could not be saved. Try again." };
  }
}
const cleanSpec = (spec: AudienceSpec) => ({
  batches: spec.batches,
  branches: spec.branches,
  ...(spec.min_cgpa === "" || spec.min_cgpa === undefined ? {} : { min_cgpa: Number(spec.min_cgpa) }),
  ...(spec.max_backlogs === "" || spec.max_backlogs === undefined ? {} : { max_backlogs: Number(spec.max_backlogs) }),
  ...(spec.min_attendance === "" || spec.min_attendance === undefined ? {} : { min_attendance: Number(spec.min_attendance) }),
  add: spec.add,
  remove: spec.remove,
});

export async function previewAudience(spec: AudienceSpec, search = "", page = 1) {
  return post<AudiencePreview>("/placement/audience/preview", { spec: cleanSpec(spec), search: search.slice(0, 100), page });
}

export async function searchStudents(term: string): Promise<ActionResult<AudienceStudent[]>> {
  try {
    await officerSession();
    const q = new URLSearchParams({ q: term.slice(0, 100) });
    return { ok: true, data: (await backendApi<{ data: AudienceStudent[] }>(`/placement/audience/search?${q}`)).data };
  } catch (error) {
    return { ok: false, error: error instanceof CampusError ? error.message : "Search failed. Try again." };
  }
}

export async function reviewRequest(
  id: string,
  decision: "approve" | "return" | "reject",
  details: { comment?: string; revision?: number; academic_year?: string; audience?: AudienceSpec },
) {
  if (!uuid.test(id)) return { ok: false, error: "Invalid request." } as const;
  const result = await post<{ status: string; driveId?: string; audience?: number; notified?: number }>(
    `/placement/company-requests/${id}/review`,
    {
      decision,
      ...(details.comment ? { comment: details.comment.slice(0, 2000) } : {}),
      ...(details.revision ? { revision: details.revision } : {}),
      ...(details.academic_year ? { academic_year: details.academic_year } : {}),
      ...(decision === "approve" && details.audience ? { audience: cleanSpec(details.audience) } : {}),
    },
  );
  if (result.ok) revalidatePath("/placement", "layout");
  return result;
}

export async function saveAudience(driveId: string, spec: AudienceSpec) {
  if (!uuid.test(driveId)) return { ok: false, error: "Invalid drive." } as const;
  const result = await post<{ audience: number; notified: number }>(`/placement/drives/${driveId}/audience`, cleanSpec(spec));
  if (result.ok) revalidatePath(`/placement/drives/${driveId}`);
  return result;
}

export async function releaseApplicants(driveId: string, release: boolean) {
  if (!uuid.test(driveId)) return { ok: false, error: "Invalid drive." } as const;
  const result = await post<{ released: boolean; shared: number }>(`/placement/drives/${driveId}/release`, { release });
  if (result.ok) revalidatePath(`/placement/drives/${driveId}`);
  return result;
}

function mailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_EMAIL && process.env.SMTP_APP_PASSWORD);
}

/**
 * Creates an invitation. The link is returned once so the officer can copy it;
 * when SMTP is configured it is also emailed to the contact.
 */
export async function inviteContact(
  companyId: string,
  email: string,
  name: string,
): Promise<ActionResult<{ link: string; email: string; expiresAt: string; emailed: boolean; emailError?: string }>> {
  if (!uuid.test(companyId)) return { ok: false, error: "Invalid company." };
  const result = await post<{ id: string; email: string; expiresAt: string; company: string; token: string }>(
    `/placement/companies/${companyId}/invites`,
    { email: email.trim(), ...(name.trim() ? { name: name.trim().slice(0, 200) } : {}) },
  );
  if (!result.ok) return result;
  const link = `${siteOrigin()}/join/company?token=${encodeURIComponent(result.data.token)}`;
  let emailed = false;
  let emailError: string | undefined;
  if (mailConfigured()) {
    try {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        requireTLS: true,
        auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_APP_PASSWORD },
        tls: { rejectUnauthorized: true },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        disableFileAccess: true,
        disableUrlAccess: true,
        logger: false,
        debug: false,
      });
      const expires = new Date(result.data.expiresAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long" });
      const info = await transport.sendMail({
        from: process.env.SMTP_EMAIL,
        to: result.data.email,
        subject: `Invitation to the DSU placement portal for ${result.data.company}`,
        text:
          `${name.trim() ? `Hello ${name.trim()},` : "Hello,"}\n\n` +
          `The DSU Training and Placement Cell has invited you to the company portal for ${result.data.company}. ` +
          `There you can submit campus drive details, follow the review and see applicants the placement office shares with you.\n\n` +
          `Open this link to create your account or sign in with ${result.data.email}:\n${link}\n\n` +
          `The link works once and expires on ${expires}. If you did not expect this invitation, you can ignore this email.\n`,
      });
      emailed = !!info.accepted?.length;
      if (!emailed) emailError = "The email provider did not accept the message. Share the link directly.";
    } catch {
      emailError = "The invitation email could not be sent. Share the link directly.";
    }
  }
  revalidatePath(`/placement/companies/${companyId}`);
  return { ok: true, data: { link, email: result.data.email, expiresAt: result.data.expiresAt, emailed, emailError } };
}

export async function revokeInvite(companyId: string, inviteId: string) {
  if (!uuid.test(inviteId) || !uuid.test(companyId)) return { ok: false, error: "Invalid invitation." } as const;
  const result = await post<{ revoked: boolean }>(`/placement/company-invites/${inviteId}/revoke`, {});
  if (result.ok) revalidatePath(`/placement/companies/${companyId}`);
  return result;
}

export async function revokeMember(companyId: string, userId: string) {
  if (!uuid.test(userId) || !uuid.test(companyId)) return { ok: false, error: "Invalid member." } as const;
  const result = await post<{ revoked: boolean }>(`/placement/company-members/${userId}/revoke`, {});
  if (result.ok) revalidatePath(`/placement/companies/${companyId}`);
  return result;
}
