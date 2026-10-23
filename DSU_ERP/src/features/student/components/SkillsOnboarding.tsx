"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  REQUIRED_PLATFORMS,
  VISIBILITY_KEYS,
  cgpaText,
  dateText,
  githubReturnNotice,
  provenanceLabel,
  resumeStep,
  sectionLabel,
  sectionStep,
  type SkillsProfile,
} from "../lib/skills";
import { errorCode, errorDetails, errorText, skillsApi, useSkillsProfile } from "../lib/skills-client";
import { PlatformCards, PlatformStateList } from "./PlatformCards";
import { VISIBILITY_OPTIONS, VisibilityForm } from "./ProfileSharing";

const STEPS = ["Academic identity", "Developer platforms", "Profile visibility", "Review and finish"];

/** Guided four-step skills onboarding. Every step is saved on the server. */
export function SkillsOnboarding({ initial, github, githubCode }: { initial: SkillsProfile; github?: string; githubCode?: string }) {
  const skills = useSkillsProfile(initial);
  const { profile } = skills;
  const returned = githubReturnNotice(github, githubCode);
  const [step, setStep] = useState(() => (returned ? 1 : resumeStep(initial.onboarding)));
  const sections = profile.onboarding.sections;
  const done = [!!sections.identity, REQUIRED_PLATFORMS.every((p) => sections[p]), !!sections.visibility, false];
  const go = (next: number) => {
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  return (
    <div className="st-si-onboarding">
      <header className="st-heading">
        <div>
          <p className="st-eyebrow">
            <i />
            SKILLS PROFILE SETUP
          </p>
          <h1>Set up your skills profile</h1>
          <p className="st-muted">
            Four steps before you open your workspace. Each step is saved as you go, so you can leave and come back.
          </p>
        </div>
      </header>
      <ol className="st-si-steps" aria-label="Setup steps">
        {STEPS.map((title, index) => (
          <li key={title} data-active={index === step} data-done={done[index]}>
            <button type="button" onClick={() => go(index)} aria-current={index === step ? "step" : undefined}>
              <span aria-hidden="true">{done[index] ? <Check size={12} /> : index + 1}</span>
              <span>
                <small>Step {index + 1}</small>
                {title}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {step === 0 && <IdentityStep skills={skills} onNext={() => go(1)} />}
      {step === 1 && <PlatformsStep skills={skills} returned={returned} onBack={() => go(0)} onNext={() => go(2)} />}
      {step === 2 && (
        <section className="st-panel st-si-step" aria-labelledby="step-visibility">
          <h2 id="step-visibility">Profile visibility</h2>
          <p className="st-muted">Decide what authorized Placement Officers can see beyond your official record. You can change this at any time from Skills profile.</p>
          <VisibilityForm skills={skills} submitLabel="Save and continue" onSaved={() => go(3)} />
          <div className="st-si-step-nav">
            <button className="st-button st-button-secondary" onClick={() => go(1)}>
              <ArrowLeft size={14} aria-hidden="true" /> Back
            </button>
          </div>
        </section>
      )}
      {step === 3 && <ReviewStep skills={skills} onGo={go} />}
    </div>
  );
}

type Skills = ReturnType<typeof useSkillsProfile>;

function IdentityStep({ skills, onNext }: { skills: Skills; onNext: () => void }) {
  const { academic: a, onboarding } = skills.profile;
  const [error, setError] = useState("");
  const rows: [string, string][] = [
    ["Official name", a.name],
    ["USN", a.usn],
    ["Department", [a.departmentName, a.department && a.departmentName !== a.department ? `(${a.department})` : ""].filter(Boolean).join(" ") || "Not recorded"],
    ["Programme", a.program || "Not recorded"],
    ["Passing-out batch", a.batch || "Not recorded"],
    ["Semester", a.semester ? String(a.semester) : "Not recorded"],
    ["Official CGPA", cgpaText(a.cgpa)],
    ["CGPA category", a.categoryLabel || "Unclassified"],
    ["Placement eligibility", a.eligible === null ? "Not determined" : a.eligible ? "Eligible" : "Not eligible"],
  ];
  return (
    <section className="st-panel st-si-step" aria-labelledby="step-identity">
      <div className="st-si-step-title">
        <h2 id="step-identity">Your official academic record</h2>
        <span className="st-si-provenance">{provenanceLabel("institution_verified")}</span>
      </div>
      <p className="st-muted">These details come from the university ERP. They cannot be edited here, and placement officers always see them.</p>
      <dl className="st-si-record">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="st-si-note">If anything here is wrong, contact the Training and Placement Cell. They can have the official record corrected.</p>
      {error && (
        <p className="st-error" role="alert">
          {error}
        </p>
      )}
      <div className="st-si-step-nav">
        {onboarding.identityConfirmedAt ? (
          <>
            <p className="st-success">Confirmed on {dateText(onboarding.identityConfirmedAt)}.</p>
            <button className="st-button" onClick={onNext}>
              Continue <ArrowRight size={14} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button
            className="st-button"
            disabled={skills.busy !== null}
            onClick={async () => {
              setError("");
              const result = await skills.act("identity", () => skillsApi.confirmIdentity());
              if (result.ok) onNext();
              else setError(errorText(result.error));
            }}
          >
            {skills.busy === "identity" ? "Saving" : "These details are correct"}
          </button>
        )}
      </div>
    </section>
  );
}

function PlatformsStep({
  skills,
  returned,
  onBack,
  onNext,
}: {
  skills: Skills;
  returned: ReturnType<typeof githubReturnNotice>;
  onBack: () => void;
  onNext: () => void;
}) {
  const sections = skills.profile.onboarding.sections;
  const remaining = REQUIRED_PLATFORMS.filter((p) => !sections[p]);
  return (
    <section className="st-panel st-si-step" aria-labelledby="step-platforms">
      <h2 id="step-platforms">Developer platforms</h2>
      <p className="st-muted">
        GitHub, LeetCode and LinkedIn are required. Connect or enter each profile to continue. HackerRank, Hugging Face and Kaggle are optional, and you can add or update them at any time.
      </p>
      {returned && (
        <p className={returned.tone === "good" ? "st-success" : "st-error"} role={returned.tone === "good" ? "status" : "alert"}>
          {returned.text}
        </p>
      )}
      <PlatformCards skills={skills} mode="onboarding" />
      <p className="st-si-note">Syncing continues in the background and does not affect finishing setup. A failed sync never undoes your setup.</p>
      <div className="st-si-step-nav">
        <button className="st-button st-button-secondary" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" /> Back
        </button>
        {remaining.length > 0 && (
          <p className="st-si-fine" role="status">
            Still to answer: {remaining.map((p) => sectionLabel(p)).join(", ")}.
          </p>
        )}
        <button className="st-button" disabled={remaining.length > 0} onClick={onNext}>
          Continue <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function ReviewStep({ skills, onGo }: { skills: Skills; onGo: (step: number) => void }) {
  const { profile } = skills;
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const outstanding = missing.length ? missing : profile.onboarding.missing;
  return (
    <section className="st-panel st-si-step" aria-labelledby="step-review">
      <h2 id="step-review">Review and finish</h2>
      <div className="st-si-review">
        <div>
          <h3>Institution record</h3>
          <p>
            {profile.onboarding.identityConfirmedAt ? `Confirmed on ${dateText(profile.onboarding.identityConfirmedAt)}.` : "Not confirmed yet."}{" "}
            <button className="st-si-link" onClick={() => onGo(0)}>Review</button>
          </p>
        </div>
        <div>
          <h3>Developer platforms</h3>
          <PlatformStateList profile={profile} />
          <button className="st-si-link" onClick={() => onGo(1)}>Change platforms</button>
        </div>
        <div>
          <h3>Shared with placement officers</h3>
          {profile.onboarding.sections.visibility ? (
            <ul className="st-si-plain">
              <li>Official institution record: always</li>
              {VISIBILITY_KEYS.map((key) => (
                <li key={key}>
                  {VISIBILITY_OPTIONS.find((o) => o.key === key)!.label}: <strong>{profile.visibility[key] ? "Shared" : "Hidden"}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>Not saved yet.</p>
          )}
          <button className="st-si-link" onClick={() => onGo(2)}>Change visibility</button>
        </div>
      </div>
      {outstanding.length > 0 && (
        <div className="st-error" role="alert">
          <p>Finish these before completing setup:</p>
          <ul>
            {outstanding.map((key) => (
              <li key={key}>
                <button className="st-si-link" onClick={() => onGo(sectionStep(key))}>
                  {sectionLabel(key)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="st-si-note">Syncing continues in the background after you finish. It does not affect completion.</p>
      <label className="st-si-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          The details I provided are accurate, and I agree that authorized Placement Officers at DSU can view my skills profile as described above.
        </span>
      </label>
      {error && (
        <p className="st-error" role="alert">
          {error}
        </p>
      )}
      <div className="st-si-step-nav">
        <button className="st-button st-button-secondary" onClick={() => onGo(2)}>
          <ArrowLeft size={14} aria-hidden="true" /> Back
        </button>
        <button
          className="st-button"
          disabled={!consent || skills.busy !== null}
          onClick={async () => {
            setError("");
            setMissing([]);
            const result = await skills.act("complete", () => skillsApi.complete(profile.revision), { reload: false });
            if (result.ok) {
              // A full load so the workspace shell and navigation appear.
              window.location.assign("/student/dashboard");
              return;
            }
            const code = errorCode(result.error);
            if (code === "ONBOARDING_INCOMPLETE") setMissing(errorDetails(result.error).missing || []);
            setError(
              code === "PROFILE_CHANGED"
                ? "Your skills profile changed in another tab or by a sync. The latest version is loaded. Review it and finish again."
                : errorText(result.error),
            );
          }}
        >
          {skills.busy === "complete" ? "Finishing" : "Finish setup"}
        </button>
      </div>
    </section>
  );
}
