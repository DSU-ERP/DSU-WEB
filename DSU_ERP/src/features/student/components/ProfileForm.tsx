"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { studentFetch } from "../lib/client";
import type { ProfileDetails, ProfileState } from "../lib/types";
import { ErrorNote, PageTitle, Panel } from "./UI";
const STEPS = [
  "Your student workspace",
  "Your DSU identity",
  "Placement context",
  "Goals & preferences",
  "Review & enter",
];
export function ProfileForm({
  initial,
  onboarding = false,
}: {
  initial: ProfileState;
  onboarding?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0),
    [tab, setTab] = useState("Profile"),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(initial.revision);
  const [details, setDetails] = useState<ProfileDetails>({
    fullName: initial.official.full_name,
    phone: "",
    city: "",
    university: "Dayananda Sagar University",
    campus: "",
    school: "",
    department: initial.official.department_name || "",
    program: initial.official.course_name || "",
    specialization: "",
    semester: initial.official.current_semester || "",
    graduationYear: initial.official.source_batch,
    dreamRoles: "",
    bio: "",
    attendanceGoal: 85,
    goals: [],
    voiceStyle: "mentor",
    focus: "",
    linkedin: "",
    portfolio: "",
    platform: "LinkedIn",
    placementProfile: "",
    certifications: "",
    notifications: true,
    github:'',interests:[],skills:'',internshipPreference:'',
    ...initial.details,
  });
  const change = (
    key: keyof ProfileDetails,
    value: string | number | boolean | string[],
  ) => setDetails((prev) => ({ ...prev, [key]: value }));
  const input = (key: keyof ProfileDetails, title: string, type = "text") => (
    <label key={key}>
      {title}
      <input
        type={type}
        value={String(details[key])}
        onChange={(e) =>
          change(
            key,
            type === "number" ? Number(e.target.value) : e.target.value,
          )
        }
        maxLength={key === "bio" ? 2000 : 300}
        required={key === "fullName"}
        min={type === "number" ? 0 : undefined}
        max={type === "number" ? 100 : undefined}
      />
    </label>
  );
  const save = async () => {
    if (details.fullName.trim().length < 2) {
      setError("Enter your full name.");
      setStep(1);
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await studentFetch<{ revision: number }>("profile", {
        method: "POST",
        body: { details, revision, complete: onboarding },
      });
      setRevision(result.revision);
      setSuccess("Your profile has been saved.");
      if (onboarding) router.push("/student/dashboard");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        title={
          onboarding
            ? "Make this workspace yours."
            : "Your profile, your direction."
        }
        description={
          onboarding
            ? "Five small steps. A clearer path to what comes next."
            : "Keep your preparation profile accurate. Official university records are managed by your campus."
        }
      />
      {!onboarding && (
        <div className="st-tabs" role="tablist" aria-label="Profile settings">
          {["Profile", "Career links", "Preferences", "Help & support"].map(
            (item) => (
              <button
                key={item}
                role="tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
      )}
      <div className={onboarding ? "st-onboarding" : ""}>
        {onboarding && (
          <aside className="st-steps">
            {STEPS.map((title, index) => (
              <div className="st-step" data-active={step === index} key={title}>
                <span>{index < step ? "✓" : index + 1}</span>
                {title}
              </div>
            ))}
          </aside>
        )}
        <Panel title={onboarding ? STEPS[step] : tab}>
          <form
            className="st-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (onboarding && step < 4) {
                setError("");
                setStep(step + 1);
              } else void save();
            }}
          >
            {onboarding && step === 0 && (
              <>
                <p className="st-muted">
                  Your account is connected to your student record. Build your preparation and find your next opportunity.
                </p>
              </>
            )}
            {((onboarding && step === 1) ||
              (!onboarding && tab === "Profile")) && (
              <>
                <div className="st-form-grid">
                  {input("fullName", "Display name")}
                  {input("phone", "Phone", "tel")}
                  {input("city", "City")}
                  {input("campus", "Campus")}
                  {input("university", "University")}
                  {input("school", "School")}
                  {input("department", "Department")}
                </div>
                {!onboarding && (
                  <label>
                    Bio
                    <textarea
                      value={details.bio}
                      maxLength={2000}
                      onChange={(e) => change("bio", e.target.value)}
                    />
                  </label>
                )}
              </>
            )}
            {((onboarding && step === 2) ||
              (!onboarding && tab === "Profile")) && (
              <>
                <div className="st-form-grid">
                  <label>
                    Official USN
                    <input value={initial.official.enrollment_no} readOnly />
                  </label>
                  <label>
                    Official CGPA
                    <input
                      value={initial.official.cgpa ?? "Not recorded"}
                      readOnly
                    />
                  </label>
                  {input("program", "Program")}
                  {input("specialization", "Specialization")}
                  {input("semester", "Semester")}
                  {input("graduationYear", "Graduation year")}
                  {input("attendanceGoal", "Attendance goal (%)", "number")}
                  {input("dreamRoles", "Dream roles")}
                </div>
                <p className="st-muted">
                  Personal preferences do not replace official academic or
                  placement eligibility records.
                </p>
              </>
            )}
            {((onboarding && step === 3) ||
              (!onboarding && tab === "Preferences")) && (
              <>
                <div className="st-choice-grid">
                  {[
                    "Interview preparation",
                    "Resume improvement",
                    "Assessments",
                    "Group discussion practice",
                    "Attendance awareness",
                    "Placement tracking",
                  ].map((goal) => (
                    <button
                      className="st-choice"
                      type="button"
                      key={goal}
                      aria-pressed={details.goals.includes(goal)}
                      onClick={() =>
                        change(
                          "goals",
                          details.goals.includes(goal)
                            ? details.goals.filter((item) => item !== goal)
                            : [...details.goals, goal],
                        )
                      }
                    >
                      {goal}
                    </button>
                  ))}
                </div>
                <div className="st-form-grid">
                  <label>
                    AI voice style
                    <select
                      value={details.voiceStyle}
                      onChange={(e) => change("voiceStyle", e.target.value)}
                    >
                      <option value="mentor">Calm mentor</option>
                      <option value="confident">Bold and confident</option>
                      <option value="fast">Fast interviewer</option>
                    </select>
                  </label>
                  <label>
                    Interview focus
                    <select
                      value={details.focus}
                      onChange={(e) => change("focus", e.target.value)}
                    >
                      <option value="">Choose a focus</option>
                      {[
                        "Consulting & business analysis",
                        "Finance & banking",
                        "Marketing & sales",
                        "HR & operations",
                        "Engineering & technology",
                      ].map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={details.notifications}
                    onChange={(e) => change("notifications", e.target.checked)}
                  />
                  Show campus notifications
                </label>
              </>
            )}
            {!onboarding && tab === "Career links" && (
              <>
                <div className="st-form-grid">
                  {input("linkedin", "LinkedIn URL", "url")}
                  {input("github", "GitHub profile URL", "url")}
                  {input("portfolio", "Portfolio or personal website", "url")}
                  {input("placementProfile", "Placement profile URL", "url")}
                  <label>
                    Career platform
                    <select
                      value={details.platform}
                      onChange={(e) => change("platform", e.target.value)}
                    >
                      {[
                        "LinkedIn",
                        "Naukri",
                        "Internshala",
                        "Unstop",
                        "Coursera",
                      ].map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Case competitions and certifications
                  <textarea
                    value={details.certifications}
                    onChange={(e) => change("certifications", e.target.value)}
                    maxLength={3000}
                  />
                </label>
                <p className="st-muted">
                  These links are supplied by you. Saving them does not connect
                  or import data from those services.
                </p>
              </>
            )}
            {onboarding && step === 4 && (
              <>
                <p className="st-muted">
                  Here’s what your workspace will use. You can update these
                  details anytime in Settings.
                </p>
                <dl className="st-details">
                  {[
                    ["Name", details.fullName],
                    ["USN", initial.official.enrollment_no],
                    ["Campus", details.campus],
                    ["Program", details.program],
                    ["Specialization", details.specialization],
                    ["Semester", details.semester],
                    ["Dream roles", details.dreamRoles],
                    ["Interview focus", details.focus],
                    ["Goals", details.goals.join(", ")],
                    [
                      "Campus notifications",
                      details.notifications ? "Enabled" : "Disabled",
                    ],
                  ].map(([title, value]) => (
                    <div key={title}>
                      <dt>{title}</dt>
                      <dd>{value || "Not added"}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {!onboarding && tab === "Help & support" ? (
              <>
                <p className="st-muted">
                  For a change to your USN, academic record or account access,
                  contact your campus administrator or placement office. For a
                  preparation question, ask Observation Haki.
                </p>
                <Link
                  className="st-button st-button-secondary"
                  href="/student/observation-haki"
                >
                  Open Observation Haki ↗
                </Link>
              </>
            ) : (
              <>
                <ErrorNote message={error} />
                {success && (
                  <p className="st-success" role="status">
                    {success}
                  </p>
                )}
                <div className="st-form-actions">
                  {onboarding && step > 0 ? (
                    <button
                      className="st-button st-button-secondary"
                      type="button"
                      onClick={() => setStep(step - 1)}
                    >
                      ← Back
                    </button>
                  ) : (
                    <Link href="/student/dashboard" className="st-muted">
                      Back to dashboard
                    </Link>
                  )}
                  <button className="st-button" disabled={busy}>
                    {busy
                      ? "Saving…"
                      : onboarding
                        ? step === 4
                          ? "Enter your workspace ↗"
                          : "Continue →"
                        : "Save changes"}
                  </button>
                </div>
              </>
            )}
          </form>
        </Panel>
      </div>
    </>
  );
}
