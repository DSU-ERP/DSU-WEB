"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveRegistration } from "@/app/onboarding/actions";
import type { ProfileDetails } from "../lib/types";
import type {
  RegistrationState,
  RegistrationAcademic,
} from "../lib/registration-types";
const STEPS = [
  "Your profile",
  "Education",
  "Interests & skills",
  "Career direction",
  "Review & finish",
];
const INTERESTS = [
  "Software engineering",
  "AI & data science",
  "Cybersecurity",
  "Cloud & infrastructure",
  "Finance",
  "Marketing",
  "Business analytics",
  "Consulting",
  "Human resources",
  "Operations",
  "Design",
  "Entrepreneurship",
];
export function RegistrationWizard({
  initial,
}: {
  initial: RegistrationState;
}) {
  const router = useRouter(),
    official = initial.official;
  const [step, setStep] = useState(initial.draft?.step || 0),
    [revision, setRevision] = useState(initial.draft?.revision || 0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(""),
    [consent, setConsent] = useState(false),
    [pending, setPending] = useState(initial.draft?.status === "pending"),
    [customInterest, setCustomInterest] = useState("");
  const [details, setDetails] = useState<ProfileDetails>({
    fullName: initial.name || "",
    phone: "",
    city: "",
    university: "Dayananda Sagar University",
    campus: "",
    school: "",
    department: "",
    program: "",
    specialization: "",
    semester: "",
    graduationYear: "",
    dreamRoles: "",
    bio: "",
    attendanceGoal: 85,
    goals: [],
    voiceStyle: "mentor",
    focus: "",
    linkedin: "",
    portfolio: "",
    github: "",
    platform: "LinkedIn",
    placementProfile: "",
    certifications: "",
    notifications: true,
    interests: [],
    skills: "",
    internshipPreference: "",
    ...initial.profile?.details,
    ...initial.draft?.details,
    ...(official
      ? {
          fullName: official.full_name,
          phone: initial.draft?.details.phone || official.phone || "",
          city: initial.draft?.details.city || official.city || "",
          department: official.department_name || "",
          program: official.course_name || "",
          semester: official.current_semester || "",
          graduationYear: official.source_batch,
        }
      : {}),
  });
  const [academic, setAcademic] = useState<RegistrationAcademic>({
    enrollmentNo: "",
    yearOfStudy: "",
    cgpa: "",
    ...initial.draft?.academic,
    ...(official
      ? { enrollmentNo: official.enrollment_no, cgpa: official.cgpa ?? "" }
      : {}),
  });
  const change = <K extends keyof ProfileDetails>(
    key: K,
    value: ProfileDetails[K],
  ) => setDetails((current) => ({ ...current, [key]: value }));
  const field = (
    key: keyof ProfileDetails,
    label: string,
    type = "text",
    readonly = false,
    required = false,
  ) => (
    <label key={key}>
      {label}
      <input
        type={type}
        value={String(details[key] ?? "")}
        readOnly={readonly}
        required={required}
        maxLength={type === "url" ? 1000 : 300}
        onChange={(e) => change(key, e.target.value)}
      />
    </label>
  );
  const toggleInterest = (interest: string) => {
    if (details.interests.includes(interest))
      change(
        "interests",
        details.interests.filter((item) => item !== interest),
      );
    else if (details.interests.length < 20)
      change("interests", [...details.interests, interest]);
  };
  const save = async (nextStep: number, complete = false) => {
    if (details.fullName.trim().length < 2) {
      setError("Enter your full name before saving.");
      return;
    }
    if (step === 2 && nextStep > step && !details.interests.length) {
      setError("Choose at least one interest.");
      return;
    }
    if (complete && !consent) {
      setError("Confirm your details before continuing.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const result = await saveRegistration({
        details,
        academic,
        step: nextStep,
        revision,
        complete,
        consent,
      });
      if (!result.data) throw Error(result.error);
      setRevision(result.data.revision);
      setSaved("Progress saved.");
      if (result.data.home) {
        router.replace(result.data.home);
        router.refresh();
        return;
      }
      if (result.data.status === "pending" && complete) setPending(true);
      else setStep(nextStep);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (pending)
    return (
      <section className="st-panel">
        <p className="st-eyebrow">DETAILS RECEIVED</p>
        <h1>Your profile is saved for verification.</h1>
        <p>
          We could not safely connect this email to one available university
          record. The campus team must verify your details before academic
          records and placement access are enabled.
        </p>
        <p className="st-muted">
          Your interests and career preferences are saved. You can correct them
          below.
        </p>
        <button className="st-button" onClick={() => setPending(false)}>
          Review my details
        </button>
      </section>
    );
  return (
    <div className="st-registration-grid">
      <aside>
        <p className="st-eyebrow">YOUR DSU START</p>
        <h1>
          One account.
          <br />
          Your next chapter.
        </h1>
        <p className="st-muted">
          Five steps to connect your university record with your goals.
        </p>
        <ol className="st-registration-steps">
          {STEPS.map((label, index) => (
            <li key={label} aria-current={index === step ? "step" : undefined}>
              <span>{index < step ? "✓" : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </aside>
      <section className="st-panel">
        <p className="st-eyebrow">STEP {step + 1} OF 5</p>
        <h2>{STEPS[step]}</h2>
        <p className="st-muted st-registration-match">
          {official
            ? "Your verified email matches your university record. Recorded details are filled in below."
            : initial.state === "review"
              ? "Your email match needs campus review. Fill in your details; no other student’s record will be shown."
              : "No university record matches your verified email yet. Add your details for campus verification."}
        </p>
        <form
          className="st-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save(Math.min(step + 1, 4), step === 4);
          }}
        >
          {step === 0 && (
            <>
              <div className="st-form-grid">
                {field(
                  "fullName",
                  official ? "Full name · university record" : "Full name",
                  "text",
                  !!official,
                  true,
                )}
                <label>
                  Verified email
                  <input type="email" value={initial.email || ""} readOnly />
                </label>
                {field("phone", "Phone number", "tel")}
                {field("city", "City")}
                {field("campus", "Campus")}
                {field("school", "School / faculty")}
              </div>
              <label>
                About you
                <textarea
                  maxLength={2000}
                  value={details.bio}
                  onChange={(e) => change("bio", e.target.value)}
                  placeholder="Tell us a little about your experience and what motivates you."
                />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <div className="st-form-grid">
                <label>
                  {official
                    ? "Official USN / enrollment number"
                    : "USN / enrollment number"}
                  <input
                    value={academic.enrollmentNo}
                    readOnly={!!official}
                    required
                    maxLength={80}
                    onChange={(e) =>
                      setAcademic({ ...academic, enrollmentNo: e.target.value })
                    }
                  />
                </label>
                {field("department", "Department", "text", !!official, true)}
                {field("program", "Program", "text", !!official, true)}
                {field("semester", "Current semester", "text", !!official)}
                <label>
                  Year of study
                  <select
                    value={academic.yearOfStudy}
                    onChange={(e) =>
                      setAcademic({ ...academic, yearOfStudy: e.target.value })
                    }
                  >
                    <option value="">Select year</option>
                    {["1", "2", "3", "4", "5", "6", "Graduated"].map((year) => (
                      <option key={year}>{year}</option>
                    ))}
                  </select>
                </label>
                {field(
                  "graduationYear",
                  "Graduating batch",
                  "text",
                  !!official,
                )}
                {field("specialization", "Specialization")}
                <label>
                  {official ? "Official CGPA" : "CGPA · self-reported"}
                  <input
                    value={academic.cgpa}
                    readOnly={!!official}
                    inputMode="decimal"
                    pattern="([0-9](\.[0-9]{1,3})?|10(\.0{1,3})?)?"
                    onChange={(e) =>
                      setAcademic({ ...academic, cgpa: e.target.value })
                    }
                    placeholder="Not recorded"
                  />
                </label>
              </div>
              <p className="st-muted">
                Recorded academics are protected. Contact the campus team for
                corrections. Self-reported details do not determine placement
                eligibility.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <fieldset>
                <legend>Your interests · choose at least one</legend>
                <div className="st-choice-grid">
                  {[...new Set([...INTERESTS, ...details.interests])].map(
                    (interest) => (
                      <button
                        type="button"
                        className="st-choice"
                        key={interest}
                        aria-pressed={details.interests.includes(interest)}
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
              <div className="st-actions">
                <label>
                  Another interest
                  <input
                    value={customInterest}
                    maxLength={100}
                    onChange={(e) => setCustomInterest(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="st-button st-button-secondary"
                  onClick={() => {
                    const interest = customInterest.trim();
                    if (interest && !details.interests.includes(interest))
                      toggleInterest(interest);
                    setCustomInterest("");
                  }}
                >
                  Add interest
                </button>
              </div>
              <label>
                Skills and tools
                <textarea
                  value={details.skills}
                  maxLength={2000}
                  onChange={(e) => change("skills", e.target.value)}
                  placeholder="For example: Python, Excel, communication, market research"
                />
              </label>
              <label>
                Certifications and achievements
                <textarea
                  value={details.certifications}
                  maxLength={3000}
                  onChange={(e) => change("certifications", e.target.value)}
                />
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <div className="st-form-grid">
                {field(
                  "dreamRoles",
                  "Roles you want to explore",
                  "text",
                  false,
                  true,
                )}
                <label>
                  Looking for
                  <select
                    value={details.internshipPreference}
                    onChange={(e) =>
                      change("internshipPreference", e.target.value)
                    }
                  >
                    <option value="">Choose a preference</option>
                    <option>Internships</option>
                    <option>Full-time opportunities</option>
                    <option>Both internships and full-time roles</option>
                    <option>Exploring my options</option>
                  </select>
                </label>
                {field("linkedin", "LinkedIn profile", "url")}
                {field("github", "GitHub profile", "url")}
                {field("portfolio", "Portfolio / website", "url")}
                {field("placementProfile", "Other career profile", "url")}
              </div>
              <p className="st-muted">
                Profile links are optional. Never paste passwords or access
                tokens here.
              </p>
              <fieldset>
                <legend>What should your workspace help you with?</legend>
                <div className="st-choice-grid">
                  {[
                    "Interview preparation",
                    "Resume improvement",
                    "Assessments",
                    "Placement tracking",
                  ].map((goal) => (
                    <button
                      className="st-choice"
                      type="button"
                      aria-pressed={details.goals.includes(goal)}
                      key={goal}
                      onClick={() =>
                        change(
                          "goals",
                          details.goals.includes(goal)
                            ? details.goals.filter((x) => x !== goal)
                            : [...details.goals, goal],
                        )
                      }
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="st-registration-check">
                <input
                  type="checkbox"
                  checked={details.notifications}
                  onChange={(e) => change("notifications", e.target.checked)}
                />
                Show campus notifications
              </label>
            </>
          )}
          {step === 4 && (
            <>
              <dl className="st-details">
                {[
                  ["Name", details.fullName],
                  ["Verified email", initial.email],
                  ["USN", academic.enrollmentNo],
                  ["Program", details.program],
                  ["Department", details.department],
                  ["Semester", details.semester],
                  ["Interests", details.interests.join(", ")],
                  ["Skills", details.skills],
                  ["Career goals", details.dreamRoles],
                  ["GitHub", details.github],
                  ["LinkedIn", details.linkedin],
                  [
                    "Record status",
                    official
                      ? "Matched university record"
                      : "Campus verification required",
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "Not added"}</dd>
                  </div>
                ))}
              </dl>
              <label className="st-registration-check">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I confirm these details are accurate and agree to use them to
                set up my student workspace.
              </label>
            </>
          )}
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
            {step > 0 && (
              <button
                type="button"
                className="st-button st-button-secondary"
                disabled={busy}
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="st-button st-button-secondary"
              disabled={busy}
              onClick={() => void save(step)}
            >
              Save draft
            </button>
            <button className="st-button" disabled={busy}>
              {busy
                ? "Saving…"
                : step === 4
                  ? official
                    ? "Finish & open workspace"
                    : "Submit for verification"
                  : "Save & continue →"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
