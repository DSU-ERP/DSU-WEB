"use client";
import { useEffect, useState } from "react";
import { EyeOff, ShieldCheck } from "lucide-react";
import {
  PLATFORM_LABELS,
  cgpaText,
  dateText,
  featuredSourceLabel,
  metricName,
  metricText,
  placementPreview,
  provenanceLabel,
  rankReason,
  rankText,
  submittedSummary,
  type SkillsProfile,
  type Visibility,
} from "../lib/skills";
import { errorCode, errorText, skillsApi, type useSkillsProfile } from "../lib/skills-client";
import { Badge } from "./PlatformCards";

type Skills = ReturnType<typeof useSkillsProfile>;

export const VISIBILITY_OPTIONS: { key: keyof Visibility; label: string; detail: string }[] = [
  { key: "platforms", label: "Platform links and figures", detail: "Your linked profiles, the figures you entered and figures read from GitHub and Hugging Face." },
  { key: "projects", label: "Featured projects", detail: "Up to three public GitHub repositories, pinned on GitHub or selected by you." },
  { key: "activity", label: "Coding activity", detail: "Public GitHub contribution counts and streaks." },
  { key: "summary", label: "AI skill summary", detail: "The latest summary you generate, unless you hide it." },
];

/** What officers can always see, and the four choices the student controls. */
export function VisibilityForm({ skills, onSaved, submitLabel = "Save visibility" }: { skills: Skills; onSaved?: () => void; submitLabel?: string }) {
  const [choice, setChoice] = useState<Visibility>(skills.profile.visibility);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const serverVisibility = JSON.stringify(skills.profile.visibility);
  useEffect(() => {
    setChoice(JSON.parse(serverVisibility));
  }, [serverVisibility]);
  return (
    <form
      className="st-si-visibility"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setSaved("");
        const wanted = choice;
        const result = await skills.act("visibility", () => skillsApi.saveVisibility(wanted, skills.profile.revision));
        if (result.ok) {
          setSaved("Visibility saved.");
          onSaved?.();
          return;
        }
        setChoice(wanted);
        setError(
          errorCode(result.error) === "PROFILE_CHANGED"
            ? "Your skills profile changed in another tab or by a sync. The latest version is loaded. Check your choices and save again."
            : errorText(result.error),
        );
      }}
    >
      <div className="st-si-always">
        <ShieldCheck size={18} strokeWidth={1.6} aria-hidden="true" />
        <div>
          <p>
            <strong>Always visible to authorized Placement Officers:</strong> your official institution record (name, USN, department, programme,
            batch, semester, official CGPA, CGPA category, ranks and placement eligibility). These come from the university ERP, not from you.
          </p>
          <p>DSU reads public data only. Private GitHub repositories are never accessed.</p>
        </div>
      </div>
      <fieldset className="st-si-toggles">
        <legend>You choose whether officers also see</legend>
        {VISIBILITY_OPTIONS.map((option) => (
          <label key={option.key} className="st-si-toggle">
            <input
              type="checkbox"
              role="switch"
              checked={choice[option.key]}
              onChange={(e) => setChoice({ ...choice, [option.key]: e.target.checked })}
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.detail}</small>
            </span>
            <em>{choice[option.key] ? "Shared" : "Hidden"}</em>
          </label>
        ))}
      </fieldset>
      {error && (
        <p className="st-error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="st-success" role="status">
          {saved}
        </p>
      )}
      <div className="st-actions">
        <button className="st-button" disabled={skills.busy !== null}>
          {skills.busy === "visibility" ? "Saving" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** Read-only preview of what an authorized Placement Officer sees. */
export function PlacementPreview({ profile }: { profile: SkillsProfile }) {
  const view = placementPreview(profile);
  const a = view.academic;
  const hidden = (key: keyof Visibility) => view.hidden.includes(key);
  const reason = rankReason(a.cgpa);
  const awaitingConsent = (
    <p className="st-si-hidden">Shared after you complete onboarding. Until then officers see only which platforms you have answered.</p>
  );
  const needsGitHub = <p className="st-si-hidden">Shared when your GitHub account is linked and not hidden.</p>;
  return (
    <section className="st-si-preview" aria-label="Placement profile preview">
      <p className="st-si-preview-label">
        <Badge tone="warn">Preview</Badge> This is how your profile appears to authorized Placement Officers, based on your current settings. It is not a separate copy.
      </p>
      {!view.consented && (
        <p className="st-si-preview-label" role="note">
          You have not completed onboarding yet, so officers see your official record and the state of each platform only. Your links, figures,
          projects, activity and summary are shared after you complete onboarding.
        </p>
      )}
      <div className="st-si-preview-grid">
        <div className="st-si-preview-block">
          <h4>
            Official record <span className="st-si-provenance">{provenanceLabel("institution_verified")}</span>
          </h4>
          <dl className="st-si-dl">
            <div><dt>Name</dt><dd>{a.name}</dd></div>
            <div><dt>USN</dt><dd>{a.usn}</dd></div>
            <div><dt>Department</dt><dd>{a.departmentName || a.department || "Not recorded"}</dd></div>
            <div><dt>Batch</dt><dd>{a.batch || "Not recorded"}</dd></div>
            <div><dt>Official CGPA</dt><dd>{cgpaText(a.cgpa)}</dd></div>
            <div><dt>Category</dt><dd>{a.categoryLabel || "Unclassified"}</dd></div>
            <div><dt>Category rank</dt><dd>{rankText(view.ranking.categoryRank, view.ranking.categorySize, reason)}</dd></div>
            <div><dt>Batch rank</dt><dd>{rankText(view.ranking.batchRank, view.ranking.batchSize, reason)}</dd></div>
            <div><dt>Placement eligibility</dt><dd>{a.eligible === null ? "Not determined" : a.eligible ? "Eligible" : "Not eligible"}</dd></div>
          </dl>
        </div>
        <div className="st-si-preview-block">
          <h4>Platforms</h4>
          {view.consented && hidden("platforms") && (
            <p className="st-si-hidden"><EyeOff size={14} aria-hidden="true" /> Links and figures are hidden by your visibility settings. Officers see only whether each platform is linked.</p>
          )}
          <ul className="st-si-statelist">
            {view.accounts.map((account) => (
              <li key={account.platform}>
                <span>
                  <strong>{PLATFORM_LABELS[account.platform]}</strong>
                  {account.shared && account.handle && <small>{account.handle}</small>}
                  {account.shared && submittedSummary(account.platform, account.submitted).map((line) => <small key={line}>{line}</small>)}
                  {account.shared && account.ownership && <small className="st-si-provenance">{provenanceLabel(account.ownership)}</small>}
                </span>
                <Badge>{account.state === "linked" ? "Linked" : account.state === "declared_none" ? "Does not use" : "Not provided"}</Badge>
              </li>
            ))}
            {view.hiddenAccounts.map((platform) => (
              <li key={platform}>
                <span>
                  <strong>{PLATFORM_LABELS[platform]}</strong>
                  <small>Officers do not see this account at all.</small>
                </span>
                <Badge>Hidden by you</Badge>
              </li>
            ))}
            {!view.accounts.length && !view.hiddenAccounts.length && <li><span>No platforms provided yet.</span></li>}
          </ul>
        </div>
        <div className="st-si-preview-block">
          <h4>Featured projects</h4>
          {!view.consented ? (
            awaitingConsent
          ) : hidden("projects") ? (
            <p className="st-si-hidden"><EyeOff size={14} aria-hidden="true" /> Hidden by your visibility settings.</p>
          ) : !view.githubShared ? (
            needsGitHub
          ) : view.featured.length ? (
            <ul className="st-si-plain">
              {view.featured.map((f) => (
                <li key={f.repo.repoId}>
                  <strong>{f.repo.name}</strong> <small>{featuredSourceLabel(f.source)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="st-si-hidden">No featured projects to show.</p>
          )}
          {view.repositories.length > 0 && (
            <p className="st-si-hidden">
              Also shown: {view.repositories.length} recommended public {view.repositories.length === 1 ? "repository" : "repositories"}.
            </p>
          )}
        </div>
        <div className="st-si-preview-block">
          <h4>Coding activity</h4>
          {!view.consented ? (
            awaitingConsent
          ) : hidden("activity") ? (
            <p className="st-si-hidden"><EyeOff size={14} aria-hidden="true" /> Hidden by your visibility settings.</p>
          ) : !view.githubShared ? (
            needsGitHub
          ) : view.activity.filter((m) => m.metric !== "activity.calendar" && metricText(m)).length ? (
            <ul className="st-si-plain">
              {view.activity.filter((m) => m.metric !== "activity.calendar" && metricText(m)).map((m) => (
                <li key={m.metric}>
                  {metricName(m)}: <strong>{metricText(m)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="st-si-hidden">No coding activity to show.</p>
          )}
        </div>
        <div className="st-si-preview-block st-si-preview-wide">
          <h4>AI skill summary</h4>
          {!view.consented ? (
            awaitingConsent
          ) : hidden("summary") ? (
            <p className="st-si-hidden"><EyeOff size={14} aria-hidden="true" /> Hidden by your visibility settings.</p>
          ) : view.summaryWithheld ? (
            <p className="st-si-hidden">
              Withheld from officers because it used information you have since hidden. Generate a new summary to share an up to date one.
            </p>
          ) : view.summary?.content.summary ? (
            <>
              <p>{view.summary.content.summary.text}</p>
              <small className="st-si-provenance">AI generated on {dateText(view.summary.createdAt)}</small>
            </>
          ) : (
            <p className="st-si-hidden">{profile.summary?.hidden ? "You have hidden your summary from placement officers." : "No summary has been generated yet."}</p>
          )}
        </div>
      </div>
    </section>
  );
}
