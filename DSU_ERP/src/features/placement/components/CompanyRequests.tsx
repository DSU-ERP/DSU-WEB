"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Mail, Send, Undo2, X } from "lucide-react";
import { AudienceBuilder, initialSpec } from "./AudienceBuilder";
import { inviteContact, releaseApplicants, reviewRequest, revokeInvite, revokeMember, saveAudience } from "@/app/placement/company-actions";
import type { AudiencePreview, AudienceSpec, AudienceState, CompanyAccess, DriveRequest } from "@/features/placement/lib/company-types";

/** Approve (with the audience), return or reject a company's drive request. */
export function RequestReview({ request }: { request: DriveRequest }) {
  const router = useRouter();
  const isNew = request.kind === "new";
  const [spec, setSpec] = useState<AudienceSpec>(() => initialSpec(request.criteria));
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [comment, setComment] = useState("");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState<"" | "approve" | "return" | "reject">("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const decide = async (decision: "approve" | "return" | "reject") => {
    setError("");
    if (decision !== "approve" && !comment.trim()) return setError("Write a comment so the company knows what to change.");
    if (decision === "approve" && isNew && !preview?.total) return setError("Choose an audience with at least one student before approving.");
    if (decision === "reject" && !window.confirm("Reject this drive request? The company can submit a new one later.")) return;
    setBusy(decision);
    const result = await reviewRequest(request.id, decision, {
      comment: comment.trim() || undefined,
      revision: request.revision,
      academic_year: year || undefined,
      audience: isNew ? spec : undefined,
    });
    setBusy("");
    if (!result.ok) return setError(result.error);
    if (decision === "approve" && result.data.driveId) {
      setDone(
        isNew
          ? `Approved. The drive is live for ${result.data.audience} student${result.data.audience === 1 ? "" : "s"}; ${result.data.notified ?? 0} linked student account${result.data.notified === 1 ? " was" : "s were"} notified.`
          : "Approved. The live drive now shows the company's changes.",
      );
      router.push(`/placement/drives/${result.data.driveId}`);
    } else {
      setDone(decision === "return" ? "Returned to the company with your comment." : "Request not approved. The company has been told why.");
      router.refresh();
    }
  };
  if (request.status !== "submitted")
    return null;
  return (
    <section className="erp-panel cp-review" aria-labelledby="cp-review-title">
      <h2 id="cp-review-title">{isNew ? "Choose who receives this drive, then decide" : "Decide on these changes"}</h2>
      {isNew ? (
        <>
          <p className="erp-muted">
            The company&apos;s requested criteria are filled in as a starting point. The final audience is your decision: only these students
            will see the drive, be notified and be able to apply.
          </p>
          <AudienceBuilder options={request.options} value={spec} onChange={setSpec} onPreview={setPreview} />
          <label className="cp-inline-field">
            Academic year (optional)
            <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Defaults from the first batch, e.g. 2026-27" pattern="20[0-9]{2}-([0-9]{2}|20[0-9]{2})" maxLength={9} />
          </label>
        </>
      ) : (
        <p className="erp-muted">Approving applies every change below to the live drive. Its audience stays as it is; edit it from the drive page.</p>
      )}
      <label className="cp-inline-field">
        Comment to the company (required to return or reject)
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} rows={3} placeholder="For example: add the stipend for the internship period." />
      </label>
      {error && <p className="erp-form-error" role="alert">{error}</p>}
      {done && <p className="cp-success" role="status">{done}</p>}
      <div className="cp-decisions">
        <button type="button" className="erp-primary" disabled={!!busy} onClick={() => void decide("approve")}>
          <Check size={15} aria-hidden="true" />
          {busy === "approve" ? "Approving…" : isNew ? `Approve and publish${preview ? ` to ${preview.total}` : ""}` : "Approve changes"}
        </button>
        <button type="button" className="erp-secondary" disabled={!!busy} onClick={() => void decide("return")}>
          <Undo2 size={15} aria-hidden="true" />
          {busy === "return" ? "Returning…" : "Return for changes"}
        </button>
        <button type="button" className="erp-secondary cp-danger" disabled={!!busy} onClick={() => void decide("reject")}>
          <X size={15} aria-hidden="true" />
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </section>
  );
}

/** A live drive's audience and whether applicants are shared with the company. */
export function DriveAudiencePanel({ driveId, state }: { driveId: string; state: AudienceState }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [spec, setSpec] = useState<AudienceSpec>(() =>
    initialSpec(state.rules, state.changes),
  );
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    const result = await saveAudience(driveId, spec);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setMessage(`Audience saved: ${result.data.audience} students. ${result.data.notified} newly reached student account${result.data.notified === 1 ? " was" : "s were"} notified.`);
    setEditing(false);
    router.refresh();
  };
  const release = async (value: boolean) => {
    if (value && !window.confirm(`Share ${state.consenting} consenting applicant${state.consenting === 1 ? "" : "s"} with the company? They will see name, USN, branch, batch, CGPA, backlogs, status, college email, phone and resume.`)) return;
    setBusy(true);
    setError("");
    const result = await releaseApplicants(driveId, value);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setMessage(value ? `Shared ${result.data.shared} applicant${result.data.shared === 1 ? "" : "s"} with the company.` : "The company can no longer see applicants for this drive.");
    router.refresh();
  };
  return (
    <section className="erp-panel cp-drive-audience" aria-labelledby="cp-drive-audience-title">
      <div className="erp-section-heading">
        <h2 id="cp-drive-audience-title">Audience and company access</h2>
        {!editing && (
          <button type="button" className="erp-secondary" onClick={() => setEditing(true)}>
            {state.audienceMode ? "Edit audience" : "Choose a specific audience"}
          </button>
        )}
      </div>
      <dl className="po-facts">
        <div>
          <dt>Who receives this drive</dt>
          <dd>
            {state.audienceMode
              ? `${state.size} selected student${state.size === 1 ? "" : "s"}${state.rules ? `: batches ${state.rules.batches.join(", ")}${state.rules.branches.length ? `, ${state.rules.branches.join(", ")}` : ", all branches"}${state.rules.min_cgpa !== null ? `, CGPA ${state.rules.min_cgpa}+` : ""}` : ""}${state.changes?.add.length ? `, ${state.changes.add.length} added by hand` : ""}${state.changes?.remove.length ? `, ${state.changes.remove.length} removed` : ""}`
              : "Every student in the drive's batch who meets its eligibility criteria"}
          </dd>
        </div>
        <div>
          <dt>Company portal</dt>
          <dd>{state.hasPortal ? "This company has an active portal account" : "This company has no portal account"}</dd>
        </div>
        <div>
          <dt>Applicants shared with the company</dt>
          <dd>
            {state.released
              ? `Yes, since ${new Date(state.releasedAt!).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}`
              : "Not yet"}
            {` · ${state.consenting} applicant${state.consenting === 1 ? "" : "s"} consented to sharing`}
          </dd>
        </div>
      </dl>
      {editing && (
        <>
          <AudienceBuilder options={state.options} value={spec} onChange={setSpec} onPreview={setPreview} />
          <div className="cp-decisions">
            <button type="button" className="erp-primary" disabled={busy || !preview?.total} onClick={() => void save()}>
              {busy ? "Saving…" : `Save audience${preview ? ` (${preview.total})` : ""}`}
            </button>
            <button type="button" className="erp-secondary" disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </>
      )}
      {state.hasPortal && (
        <div className="cp-decisions">
          {state.released ? (
            <button type="button" className="erp-secondary" disabled={busy} onClick={() => void release(false)}>
              Stop sharing applicants
            </button>
          ) : (
            <button type="button" className="erp-primary" disabled={busy || state.consenting === 0} onClick={() => void release(true)}>
              <Send size={15} aria-hidden="true" /> Release applicants to the company
            </button>
          )}
          {!state.released && state.consenting === 0 && <span className="erp-muted">No consenting applicants yet.</span>}
        </div>
      )}
      {error && <p className="erp-form-error" role="alert">{error}</p>}
      {message && <p className="cp-success" role="status">{message}</p>}
    </section>
  );
}

/** Invite a company contact and manage who can use the company portal. */
export function CompanyAccessPanel({ companyId, companyName, defaultEmail, access }: {
  companyId: string;
  companyName: string;
  defaultEmail?: string;
  access: CompanyAccess;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail || "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState<{ link: string; email: string; expiresAt: string; emailed: boolean; emailError?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setCopied(false);
    const result = await inviteContact(companyId, email, name);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setInvite(result.data);
    router.refresh();
  };
  const copy = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.link);
      setCopied(true);
    } catch {
      setError("Copy failed. Select the link and copy it manually.");
    }
  };
  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, question: string) => {
    if (!window.confirm(question)) return;
    const result = await fn();
    if (!result.ok) setError(result.error || "The change could not be saved.");
    else router.refresh();
  };
  const active = access.members.filter((m) => m.active);
  return (
    <section className="erp-panel cp-access" aria-labelledby="cp-access-title">
      <h2 id="cp-access-title">Company portal access</h2>
      <p className="erp-muted">
        Invited contacts can submit drive details for {companyName}, follow your review and see applicants you release. They never see other
        companies or students who have not applied.
      </p>
      <form className="cp-invite" onSubmit={send}>
        <label>
          Contact email
          <input type="email" required maxLength={320} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hr@company.com" />
        </label>
        <label>
          Contact name (optional)
          <input maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="erp-primary" disabled={busy}>
          <Mail size={15} aria-hidden="true" /> {busy ? "Creating…" : "Create invitation"}
        </button>
      </form>
      {error && <p className="erp-form-error" role="alert">{error}</p>}
      {invite && (
        <div className="cp-invite-result" role="status">
          <p>
            {invite.emailed
              ? `Invitation emailed to ${invite.email}. You can also share this link directly.`
              : invite.emailError || `Share this link with ${invite.email}. Email sending is not configured on this server.`}{" "}
            It works once and expires on {new Date(invite.expiresAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" })}.
            This is the only time the link is shown.
          </p>
          <div className="cp-copy">
            <input readOnly value={invite.link} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="erp-secondary" onClick={() => void copy()}>
              <Copy size={14} aria-hidden="true" /> {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
      <h3>Members</h3>
      {active.length ? (
        <ul className="cp-people">
          {active.map((member) => (
            <li key={member.userId}>
              <div>
                <strong>{member.name || member.email}</strong>
                <span>{member.email} · since {member.since.slice(0, 10)}</span>
              </div>
              <button
                type="button"
                className="erp-secondary cp-danger"
                onClick={() => void act(() => revokeMember(companyId, member.userId), `Remove portal access for ${member.email}?`)}
              >
                Remove access
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="erp-muted">No one from this company has portal access yet.</p>
      )}
      {access.invites.length > 0 && (
        <>
          <h3>Invitations</h3>
          <ul className="cp-people">
            {access.invites.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.email}</strong>
                  <span>
                    {item.state === "pending" ? "Waiting to be accepted" : item.state[0].toUpperCase() + item.state.slice(1)} · sent{" "}
                    {item.createdAt.slice(0, 10)}
                  </span>
                </div>
                {item.state === "pending" && (
                  <button
                    type="button"
                    className="erp-secondary"
                    onClick={() => void act(() => revokeInvite(companyId, item.id), `Cancel the invitation for ${item.email}?`)}
                  >
                    Cancel invitation
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
