"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ClipboardCheck,
  Flag,
  LockKeyhole,
  Check,
  ChevronRight,
  Gauge,
  BrainCircuit,
  Activity,
  BookOpen,
  Layers,
  GraduationCap,
  Sparkles,
  EyeOff,
  CircleDashed,
  CircleCheck,
} from "lucide-react";
import { studentFetch } from "../lib/client";
import { useElapsed } from "../lib/useElapsed";
import {
  answeredProgress,
  blueprintStatus,
  difficultyLabel,
  durationLabel,
  EVENT_LABELS,
  focusLeftPage,
  idleLabel,
  insightPrompt,
  integrityCounts,
  integrityThrottle,
  isAnswered,
  LEVEL_LABELS,
  levelLabel,
  portionChips,
  releaseLabel,
  SECTION_CAP,
  severityOf,
} from "../lib/assessment";
import { DocumentUpload } from "./DocumentUpload";
import { PageTitle, Panel, Metric, Empty, ErrorNote, DateLabel } from "./UI";
export type Question = {
  id: string;
  section: string;
  type: "mcq" | "short";
  question: string;
  options: string[];
  marks: number;
};
// While an assigned test's answers are withheld, the server omits the key,
// feedback and per-question marks, so those fields are optional.
export type ReviewQuestion = Question & {
  answer: string;
  selectedText: string;
  expected?: string;
  score?: number;
  state?: string;
  feedback?: string;
};
export type IntegrityEvent = {
  kind: string;
  at: string;
  seconds: number;
  severity?: "high" | "medium" | "low";
};
export type IntegritySummary = {
  total: number;
  high: number;
  medium: number;
  low: number;
};
export type SectionScore = {
  name: string;
  score: number;
  maximum: number;
  questions: number;
  correct: number;
  percentage: number;
};
export type InsightItem = { text: string; questionIds: string[] };
export type Insights = {
  strengths: InsightItem[];
  weaknesses: InsightItem[];
  suggestions: InsightItem[];
  generatedAt: string;
};
// While answers are withheld the server also omits section marks, strengths,
// weaknesses and recommendations: they are derived from per-question marks.
export type TestResult = {
  title: string;
  difficulty: string;
  score: number;
  maximum: number;
  percentage: number;
  attempted: number;
  correct: number;
  partial: number;
  unanswered: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  review: ReviewQuestion[];
  kind: string;
  category: string | null;
  level: number | null;
  integrity: IntegrityEvent[];
  integritySummary?: IntegritySummary;
  highRisk?: number;
  sections?: SectionScore[];
  answersWithheld?: boolean;
  answersReleaseAt?: string | null;
  submittedAt: string;
  durationSeconds: number;
};
export type HistoryResult = Omit<TestResult, "review">;
export type Attempt = {
  id: string;
  status: "active" | "submitted" | "completed";
  title: string;
  kind: string;
  category?: string | null;
  level?: number | null;
  config: { durationMinutes: number; fullscreen: boolean; difficulty: string };
  questions: Question[];
  answers: Record<string, string>;
  marked: string[];
  expires_at: string;
  revision: number;
  result: TestResult | null;
  integrity: IntegrityEvent[];
  insights?: Insights | null;
  answerRelease?: { withheld: boolean; releaseAt: string | null };
  official: { name: string; usn: string };
};
export type AttemptHistory = {
  id: string;
  status: string;
  title: string;
  kind: string;
  started_at: string;
  submitted_at: string | null;
  expires_at: string;
  result: HistoryResult | null;
  category: string | null;
  level: number | null;
  integritySummary?: IntegritySummary;
  answersReleaseAt?: string | null;
};
type Section = { name: string; count: number; type: "mcq" | "short" | "mixed" };
export function MockTestBuilder({ history }: { history: AttemptHistory[] }) {
  const router = useRouter();
  const [source, setSource] = useState<"topics" | "jd">("topics"),
    [context, setContext] = useState(""),
    [sections, setSections] = useState<Section[]>([
      { name: "Aptitude", count: 10, type: "mcq" },
      { name: "Technical", count: 10, type: "mcq" },
      { name: "HR / Behavioral", count: 5, type: "short" },
    ]),
    [difficulty, setDifficulty] = useState("medium"),
    [duration, setDuration] = useState(30),
    [fullscreen, setFullscreen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState<string | null>(null);
  const status = blueprintStatus({ context, sections, duration }),
    count = status.total,
    active = history.find(
      (item) => item.status === "active" && item.kind === "ai",
    );
  const waited = useElapsed(busy);
  const generate = async () => {
    setError("");
    if (status.issues.length) {
      setError(status.issues.join(" "));
      return;
    }
    setBusy(true);
    try {
      setReady(
        (
          await studentFetch<{ id: string }>("assessments/generate", {
            method: "POST",
            body: {
              source,
              context,
              sections,
              difficulty,
              durationMinutes: duration,
              fullscreen,
            },
          })
        ).id,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const start = async () => {
    if (!ready) return;
    setError("");
    try {
      if (fullscreen) {
        if (!document.documentElement.requestFullscreen)
          throw Error(
            "Fullscreen is unavailable in this browser. Turn it off or use a supported browser.",
          );
        await document.documentElement.requestFullscreen();
      }
      const result = await studentFetch<{ id: string }>(
        `assessments/${ready}/start`,
        { method: "POST", body: { accepted: true } },
      );
      router.push(`/student/ai-mock-test/test?attempt=${result.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <>
      <PageTitle
        title="Design a sharper mock test."
        description="Choose your context, build a question blueprint and practise with purpose."
      />
      {active && (
        <div className="st-resume-banner">
          <div>
            <strong>Your unfinished test is saved.</strong>
            {/* Depends on the current time, which can differ by hydration. */}
            <p suppressHydrationWarning>
              {active.title} ·{" "}
              {Date.parse(active.expires_at) <= Date.now()
                ? "Time has expired. Submit your last saved answers."
                : "Your answers and original deadline will be restored."}
            </p>
          </div>
          <Link
            href={`/student/ai-mock-test/test?attempt=${active.id}`}
            className="st-button st-button-secondary"
          >
            Resume test ↗
          </Link>
        </div>
      )}
      <div className="st-metrics">
        <Metric
          label="Source"
          value={source === "topics" ? "Topics" : "Company JD"}
        />
        <Metric label="Questions" value={`${count} / 50`} />
        <Metric label="Sections" value={sections.length} />
        <Metric label="Intensity" value={difficulty} />
      </div>
      <ol className="st-readiness-steps" aria-label="Test readiness">
        {[
          {
            label: "Source intelligence",
            hint: "Topics or company JD",
            done: status.sourceReady,
          },
          {
            label: "Question blueprint",
            hint: `Sections of 1–${SECTION_CAP} questions, 50 in total`,
            done: status.blueprintReady,
          },
          {
            label: "Launch environment",
            hint: "Difficulty, timer and focus mode",
            done: status.launchReady,
          },
        ].map(({ label, hint, done }, index) => (
          <li key={label} className={done ? "is-done" : ""}>
            {done ? (
              <CircleCheck size={18} aria-hidden="true" />
            ) : (
              <CircleDashed size={18} aria-hidden="true" />
            )}
            <div>
              <small>0{index + 1}</small>
              <strong>{label}</strong>
              <span>
                {hint}
                <span className="st-visually-hidden">
                  {done ? " · ready" : " · needs attention"}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div className="st-two-col">
        <div>
          <Panel
            title="01 / Source intelligence"
            subtitle="Give your practice a useful direction."
          >
            <div className="st-tabs">
              <button
                aria-selected={source === "topics"}
                onClick={() => setSource("topics")}
              >
                Your topics
              </button>
              <button
                aria-selected={source === "jd"}
                onClick={() => setSource("jd")}
              >
                Company JD
              </button>
            </div>
            <div className="st-form">
              {source === "jd" && (
                <DocumentUpload
                  kind="jd"
                  label="Add the job description"
                  onReady={(document) => setContext(document.content)}
                />
              )}
              <label>
                {source === "topics"
                  ? "Topics or syllabus"
                  : "Job description context"}
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={8}
                  maxLength={30000}
                  placeholder={
                    source === "topics"
                      ? "Percentages, financial ratios, market sizing, business communication…"
                      : "Paste the role, responsibilities and required skills."
                  }
                />
              </label>
            </div>
          </Panel>
          <Panel
            title="02 / Question blueprint"
            subtitle="A little structure makes every question more useful."
          >
            <div className="st-distribution" aria-hidden="true">
              {sections.map((section, index) => (
                <span
                  key={index}
                  style={{
                    flex: section.count || 1,
                    opacity: Math.min(1, 0.4 + index * 0.12),
                  }}
                />
              ))}
            </div>
            <ul className="st-blueprint-legend" aria-label="Question distribution">
              {sections.map((section, index) => (
                <li key={index}>
                  <i
                    aria-hidden="true"
                    style={{ opacity: Math.min(1, 0.4 + index * 0.12) }}
                  />
                  <span>{section.name.trim() || "Untitled section"}</span>
                  <strong>
                    {section.count || 0} ·{" "}
                    {section.type === "mcq"
                      ? "MCQ"
                      : section.type === "short"
                        ? "written"
                        : "mixed"}
                  </strong>
                </li>
              ))}
              <li className="st-blueprint-total">
                <span>Total</span>
                <strong>{count} / 50</strong>
              </li>
            </ul>
            <div className="st-form">
              {sections.map((section, index) => (
                <div className="st-section-row" key={index}>
                  <label>
                    Section name
                    <input
                      value={section.name}
                      maxLength={100}
                      onChange={(e) =>
                        setSections((current) =>
                          current.map((item, i) =>
                            i === index
                              ? { ...item, name: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Questions
                    <input
                      type="number"
                      min={1}
                      max={SECTION_CAP}
                      value={section.count}
                      onChange={(e) =>
                        setSections((current) =>
                          current.map((item, i) =>
                            i === index
                              ? { ...item, count: Number(e.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Type
                    <select
                      value={section.type}
                      onChange={(e) =>
                        setSections((current) =>
                          current.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  type: e.target.value as Section["type"],
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="mcq">MCQ</option>
                      <option value="short">Short answer</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </label>
                  <button
                    className="st-icon-button"
                    aria-label={`Remove ${section.name}`}
                    disabled={sections.length <= 1}
                    onClick={() =>
                      setSections((current) =>
                        current.filter((_item, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="st-button st-button-secondary"
              style={{ marginTop: 18 }}
              disabled={sections.length >= 8}
              onClick={() =>
                setSections((current) => [
                  ...current,
                  {
                    name: `Section ${current.length + 1}`,
                    count: 5,
                    type: "mcq",
                  },
                ])
              }
            >
              <Plus size={14} />
              Add section
            </button>
          </Panel>
        </div>
        <Panel title="03 / Launch environment">
          <div className="st-form">
            <label>
              Difficulty
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">Easy · build confidence</option>
                <option value="medium">Medium · placement standard</option>
                <option value="hard">Hard · challenge your thinking</option>
              </select>
            </label>
            <label>
              Duration (5–180 minutes)
              <input
                type="number"
                min={5}
                max={180}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={fullscreen}
                onChange={(e) => setFullscreen(e.target.checked)}
              />
              Use a focused fullscreen workspace
            </label>
            <p className="st-muted">
              {count} questions · {sections.length} sections · {duration}{" "}
              minutes. AI-generated questions are validated before a test is
              saved.
            </p>
            {!error && status.issues.length > 0 && (
              <ul className="st-blueprint-issues">
                {status.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
            <ErrorNote message={error} />
            <button
              className="st-button"
              disabled={busy}
              onClick={() => void generate()}
            >
              {busy
                ? `Preparing your test…${waited}`
                : ready
                  ? "Regenerate test ↗"
                  : "Generate AI mock test ↗"}
            </button>
            {ready && (
              <div className="st-ready-panel">
                <Check size={18} />
                <h3>Your test is ready.</h3>
                <p>
                  The server will start your original countdown when you begin.
                </p>
                <button className="st-button" onClick={() => void start()}>
                  Begin test ↗
                </button>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
export function TestRunner({ initial }: { initial: Attempt }) {
  const router = useRouter(),
    confirmation = useRef<HTMLDialogElement>(null);
  const [answers, setAnswers] = useState(initial.answers),
    [marked, setMarked] = useState(initial.marked),
    [index, setIndex] = useState(0),
    [remaining, setRemaining] = useState(
      Math.max(
        0,
        Math.ceil((Date.parse(initial.expires_at) - Date.now()) / 1000),
      ),
    ),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [busy, setBusy] = useState(false),
    [events, setEvents] = useState(initial.integrity.length),
    [highRisk, setHighRisk] = useState(
      integrityCounts(initial.integrity).high,
    ),
    [idle, setIdle] = useState(0);
  const revision = useRef(initial.revision),
    queue = useRef<Promise<void>>(Promise.resolve()),
    submitting = useRef(false),
    latest = useRef(answers),
    firstSave = useRef(true),
    lastActivity = useRef(Date.now()),
    // Window blurs until this time come from the page's own fullscreen
    // changes or leave-page prompt, not from the student leaving the test.
    quietUntil = useRef(0);
  latest.current = answers;
  const resultPath = `/student/ai-mock-test/result?attempt=${initial.id}`;
  const openResult = async () => {
    if (document.fullscreenElement)
      await document.exitFullscreen().catch(() => {});
    router.push(resultPath);
  };
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    confirmation.current?.close();
    setError("");
    await queue.current.catch(() => {});
    try {
      await studentFetch(`attempts/${initial.id}/submit`, {
        method: "POST",
        body: { answers: latest.current },
      });
      await openResult();
    } catch (e) {
      setError((e as Error).message);
      try {
        // Submitted but not yet evaluated (for example AI grading is
        // unavailable): the result page offers a retry.
        const saved = await studentFetch<Attempt>(`attempts/${initial.id}`);
        if (saved.status !== "active") {
          await openResult();
          return;
        }
      } catch {}
      submitting.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    if (initial.status !== "active") {
      router.replace(resultPath);
      return;
    }
    const timer = setInterval(
      () =>
        setRemaining(
          Math.max(
            0,
            Math.ceil((Date.parse(initial.expires_at) - Date.now()) / 1000),
          ),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, [initial.expires_at, initial.status, resultPath, router]);
  useEffect(() => {
    if (!remaining && initial.status === "active") void submit();
  }, [remaining]);
  // Answers autosave, but leaving mid-attempt is rarely intended: ask first.
  useEffect(() => {
    if (initial.status !== "active") return;
    const warn = (event: BeforeUnloadEvent) => {
      if (submitting.current) return;
      // The browser's leave-page prompt takes focus; that is not a blur.
      quietUntil.current = Date.now() + 1500;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [initial.status]);
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      const snapshot = { answers, marked };
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          if (
            submitting.current ||
            Date.parse(initial.expires_at) <= Date.now()
          )
            return;
          setSaving(true);
          try {
            const saved = await studentFetch<{ revision: number }>(
              `attempts/${initial.id}/save`,
              {
                method: "POST",
                body: { ...snapshot, revision: revision.current },
              },
            );
            revision.current = saved.revision;
            setError("");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSaving(false);
          }
        });
    }, 500);
    return () => clearTimeout(timeout);
  }, [answers, marked, initial.id, initial.expires_at]);
  useEffect(() => {
    if (!initial.config.fullscreen) return;
    // Throttle per kind so a low-severity event never hides a high one. The
    // server applies the same rule and derives every event's severity.
    const allow = integrityThrottle();
    let blurTimer = 0;
    const record = (kind: string, seconds = 0) => {
      if (submitting.current || !allow(kind, Date.now())) return;
      void studentFetch<{ events: number; highRisk?: number }>(
        `attempts/${initial.id}/integrity`,
        { method: "POST", body: { kind, seconds } },
      )
        .then((result) => {
          setEvents(result.events);
          if (typeof result.highRisk === "number") setHighRisk(result.highRisk);
        })
        .catch(() => {});
    };
    const hidden = () => {
        if (document.hidden) record("tab-hidden");
      },
      fullscreen = () => {
        // Entering or leaving fullscreen can briefly move window focus.
        quietUntil.current = Date.now() + 1000;
        if (!document.fullscreenElement) record("fullscreen-exit");
      },
      clipboard = (e: Event) => {
        e.preventDefault();
        record("clipboard");
      },
      // Focus moved to another window while this page stayed visible. Checked
      // after a pause so transient focus changes are not recorded.
      blur = () => {
        window.clearTimeout(blurTimer);
        blurTimer = window.setTimeout(() => {
          if (
            focusLeftPage({
              hidden: document.hidden,
              hasFocus: document.hasFocus(),
              now: Date.now(),
              quietUntil: quietUntil.current,
            })
          )
            record("window-blur");
        }, 400);
      },
      activity = () => {
        lastActivity.current = Date.now();
      };
    const activityEvents = ["keydown", "pointerdown", "pointermove", "wheel"];
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("fullscreenchange", fullscreen);
    window.addEventListener("blur", blur);
    for (const name of ["copy", "cut", "paste"])
      document.addEventListener(name, clipboard);
    for (const name of activityEvents)
      document.addEventListener(name, activity, { passive: true });
    const timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastActivity.current) / 1000);
      setIdle(seconds);
      if (seconds >= 60) {
        record("inactive", Math.min(seconds, 3600));
        lastActivity.current = Date.now();
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      window.clearTimeout(blurTimer);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("fullscreenchange", fullscreen);
      window.removeEventListener("blur", blur);
      for (const name of ["copy", "cut", "paste"])
        document.removeEventListener(name, clipboard);
      for (const name of activityEvents)
        document.removeEventListener(name, activity);
    };
  }, [initial.config.fullscreen, initial.id]);
  const question = initial.questions?.[index];
  if (!question)
    return (
      <Panel>
        <Empty title="Opening your result…">
          Your submitted assessment is safely stored.
        </Empty>
        <Link href={resultPath}>Open result ↗</Link>
      </Panel>
    );
  const progress = answeredProgress(
      initial.questions.map((q) => q.id),
      answers,
    ),
    attempted = progress.answered,
    time = `${Math.floor(remaining / 60)
      .toString()
      .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;
  return (
    <section className="st-exam">
      <header className="st-exam-header">
        <div>
          <p className="st-eyebrow">
            {initial.kind === "assigned"
              ? "ASSIGNED ASSESSMENT"
              : "FOCUSED PRACTICE"}
          </p>
          <h1>{initial.title}</h1>
          <small>
            {initial.official.name} · {initial.official.usn}
          </small>
          <div className="st-exam-progress">
            <progress
              max={progress.total}
              value={progress.answered}
              aria-label={`${progress.answered} of ${progress.total} questions answered`}
            />
            <span aria-hidden="true">{progress.percent}% answered</span>
          </div>
        </div>
        <div className="st-actions">
          <span className="st-tag">
            {attempted}/{initial.questions.length} answered
          </span>
          <strong
            className={
              remaining < 60 ? "st-timer st-timer-warning" : "st-timer"
            }
            aria-label="Time remaining"
            suppressHydrationWarning
          >
            {time}
          </strong>
        </div>
      </header>
      <div className="st-exam-body">
        <main>
          <div className="st-actions">
            <span className="st-tag">{question.section}</span>
            <span className="st-muted">
              Question {index + 1} of {initial.questions.length} ·{" "}
              {question.marks} marks
            </span>
          </div>
          <h2>{question.question}</h2>
          {question.type === "mcq" ? (
            <fieldset
              className="st-answer-options"
              disabled={busy || !remaining}
            >
              <legend className="st-visually-hidden">Choose an answer</legend>
              {question.options.map((option, optionIndex) => (
                <label
                  className={
                    answers[question.id] === String(optionIndex)
                      ? "st-option st-option-selected"
                      : "st-option"
                  }
                  key={optionIndex}
                >
                  <input
                    type="radio"
                    name={question.id}
                    checked={answers[question.id] === String(optionIndex)}
                    onChange={() =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: String(optionIndex),
                      }))
                    }
                  />
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  {option}
                </label>
              ))}
            </fieldset>
          ) : (
            <textarea
              className="st-written-answer"
              aria-label="Your written answer"
              value={answers[question.id] || ""}
              onChange={(e) =>
                setAnswers((current) => ({
                  ...current,
                  [question.id]: e.target.value,
                }))
              }
              maxLength={10000}
              disabled={busy || !remaining}
              placeholder="Explain your reasoning with clear evidence."
            />
          )}
          <div className="st-form-actions">
            <button
              className="st-button st-button-secondary"
              onClick={() =>
                setMarked((current) =>
                  current.includes(question.id)
                    ? current.filter((id) => id !== question.id)
                    : [...current, question.id],
                )
              }
            >
              <Flag size={14} />
              {marked.includes(question.id)
                ? "Marked for review"
                : "Mark for review"}
            </button>
            <span className="st-muted">
              {saving ? "Saving answers…" : "Answers save as you work"}
            </span>
          </div>
          <ErrorNote message={error} />
          {initial.config.fullscreen && (
            <div className="st-integrity-note">
              <span>
                Browser integrity events recorded: {events}
                {highRisk ? ` (${highRisk} high-risk)` : ""}. No face
                detection or identity verification is claimed.
              </span>
              <span className="st-idle-readout" data-idle={idle >= 45}>
                {idleLabel(idle)} · inactivity over 60 seconds is recorded
              </span>
              <button
                onClick={() => {
                  quietUntil.current = Date.now() + 1500;
                  void document.documentElement
                    .requestFullscreen?.()
                    .catch(() => {});
                }}
                className="st-muted"
              >
                Re-enter fullscreen
              </button>
            </div>
          )}
        </main>
        <aside className="st-question-palette">
          <h3>Your question map</h3>
          <div>
            {initial.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setIndex(i)}
                aria-label={`Question ${i + 1}${isAnswered(answers[q.id]) ? ", answered" : ", unanswered"}${marked.includes(q.id) ? ", marked" : ""}`}
                aria-current={index === i ? "step" : undefined}
                data-answered={isAnswered(answers[q.id])}
                data-marked={marked.includes(q.id)}
              >
                {i + 1}
                {marked.includes(q.id) && <Flag size={8} />}
              </button>
            ))}
          </div>
          <p className="st-muted">
            Filled: answered · Flag: review · Outline: unanswered
          </p>
        </aside>
      </div>
      <footer className="st-exam-footer">
        <button
          className="st-button st-button-secondary"
          disabled={!index || busy}
          onClick={() => setIndex(index - 1)}
        >
          ← Previous
        </button>
        <span className="st-muted">{marked.length} marked for review</span>
        <div className="st-actions">
          {index < initial.questions.length - 1 && (
            <button
              className="st-button st-button-secondary"
              onClick={() => setIndex(index + 1)}
            >
              Next →
            </button>
          )}
          <button
            className="st-button"
            disabled={busy}
            onClick={() => confirmation.current?.showModal()}
          >
            {busy ? "Submitting…" : "Finish test"}
          </button>
        </div>
      </footer>
      <dialog
        className="st-dialog st-submit-dialog"
        ref={confirmation}
        aria-label="Confirm submission"
      >
        <div className="st-dialog-body">
          <ClipboardCheck size={28} />
          <h2>Ready to submit?</h2>
          <p className="st-muted">
            {attempted} answered · {initial.questions.length - attempted}{" "}
            unanswered · {marked.length} marked for review.
          </p>
          <p className="st-muted">
            Your submitted answers are final. The original server deadline
            applies after a reload.
          </p>
          <div className="st-actions">
            <button
              className="st-button st-button-secondary"
              onClick={() => confirmation.current?.close()}
            >
              Resume test
            </button>
            <button className="st-button" onClick={() => void submit()}>
              Yes, submit
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
function SectionBars({ sections }: { sections: SectionScore[] }) {
  return (
    <ul className="st-section-bars">
      {sections.map((section) => (
        <li key={section.name}>
          <div>
            <span>{section.name}</span>
            <strong>
              {section.score} / {section.maximum}
              <small> · {section.percentage}%</small>
            </strong>
          </div>
          <progress
            max={section.maximum || 1}
            value={section.score}
            aria-label={`${section.name}: ${section.score} of ${section.maximum} marks`}
            data-tone={
              section.percentage >= 70
                ? "good"
                : section.percentage >= 40
                  ? "warn"
                  : "bad"
            }
          />
          <small>
            {section.correct} of {section.questions} fully correct
          </small>
        </li>
      ))}
    </ul>
  );
}
function Diagnosis({
  attemptId,
  result,
  initial,
}: {
  attemptId: string;
  result: TestResult;
  initial: Insights | null | undefined;
}) {
  const [insights, setInsights] = useState(initial || null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const waited = useElapsed(busy);
  const number = (id: string) =>
    result.review.findIndex((q) => q.id === id) + 1;
  const cite = (ids: string[]) =>
    ids
      .map(number)
      .filter((n) => n > 0)
      .map((n) => `Q${n}`)
      .join(", ");
  const sectionsOf = (ids: string[]) =>
    result.review.filter((q) => ids.includes(q.id)).map((q) => q.section);
  if (result.answersWithheld)
    return (
      <p className="st-muted">
        A diagnosis uses the answer key, so it becomes available when answers
        are released.
      </p>
    );
  if (!insights)
    return (
      <>
        <p className="st-muted">
          AI reviews your stored answers against the key and names strengths,
          gaps and next steps. Each point must cite questions that support it,
          or nothing is shown.
        </p>
        <ErrorNote message={error} />
        <button
          className="st-button st-button-secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              setInsights(
                await studentFetch<Insights>(`attempts/${attemptId}/insights`, {
                  method: "POST",
                  body: {},
                }),
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Sparkles size={14} />
          {busy ? `Reviewing your answers…${waited}` : "Generate AI diagnosis"}
        </button>
      </>
    );
  const group = (title: string, items: InsightItem[], empty: string) => (
    <div className="st-insight-group">
      <h3>{title}</h3>
      {items.length ? (
        <ul className="st-bullets">
          {items.map((item, index) => (
            <li key={index}>
              {item.text} <small className="st-muted">({cite(item.questionIds)})</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="st-muted">{empty}</p>
      )}
    </div>
  );
  return (
    <>
      {group("Strengths", insights.strengths, "No supported strengths were identified in this attempt.")}
      {group("Gaps", insights.weaknesses, "No gaps were identified in this attempt.")}
      <div className="st-insight-group">
        <h3>Next steps</h3>
        {insights.suggestions.length ? (
          insights.suggestions.map((item, index) => (
            <Link
              className="st-recommendation-link"
              key={index}
              href={`/student/friday?prompt=${encodeURIComponent(insightPrompt(result.title, item.text, sectionsOf(item.questionIds)))}`}
            >
              <span>
                {item.text}{" "}
                <small className="st-muted">({cite(item.questionIds)})</small>
              </span>
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          ))
        ) : (
          <p className="st-muted">No further steps were suggested.</p>
        )}
      </div>
      <p className="st-muted st-insight-note">
        AI-generated from your stored answers · <DateLabel value={insights.generatedAt} />
      </p>
    </>
  );
}
export function TestResults({ initial }: { initial: Attempt }) {
  const [result, setResult] = useState(initial.result),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [error, setError] = useState("");
  const evaluate = async () => {
    setBusy(true);
    setError("");
    try {
      for (let batch = 0; batch < 10; batch++) {
        const response = await studentFetch<
          TestResult | { pending: true; graded: number; total: number }
        >(`attempts/${initial.id}/evaluate`, {
          method: "POST",
          body: {},
        });
        if ("pending" in response) {
          setProgress(
            `${response.graded} of ${response.total} written answers evaluated. Your progress is saved.`,
          );
        } else {
          setResult(response);
          break;
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!result)
    return (
      <>
        <PageTitle
          title="Your answers are saved."
          description="Objective and written answers are evaluated from your submitted work."
        />
        <Panel>
          <Empty
            title={
              busy
                ? "Analyzing your performance…"
                : "Your report needs evaluation."
            }
          >
            If an AI service was unavailable, you can retry now or later
            without taking the test again.
            {initial.kind === "practice" &&
              " Waiting does not hold your level: you can also practise it with a fresh paper."}
          </Empty>
          <ErrorNote message={error} />
          {progress && <p role="status">{progress}</p>}
          <div className="st-actions">
            <button
              className="st-button"
              onClick={() => void evaluate()}
              disabled={busy}
            >
              {busy ? "Evaluating…" : "Retry evaluation"}
            </button>
            <Link
              className="st-button st-button-secondary"
              href={
                initial.kind === "practice" && initial.category
                  ? `/student/assessments/${initial.category}`
                  : "/student/assessments"
              }
            >
              {initial.kind === "practice" && initial.category
                ? "Back to this practice path"
                : "Back to assessments"}
            </Link>
          </div>
        </Panel>
      </>
    );
  return (
    <>
      <PageTitle
        title="A result you can learn from."
        description={`${result.title} · ${difficultyLabel(result.difficulty)} · ${result.attempted} attempted`}
        action={
          <Link
            className="st-button st-button-secondary"
            href="/student/dashboard"
          >
            Return to dashboard ↗
          </Link>
        }
      />
      <div className="st-metrics">
        <Metric
          label="Overall score"
          value={`${result.score} / ${result.maximum}`}
          note={`${result.percentage}%`}
        />
        <Metric label="Fully correct" value={result.correct} />
        <Metric
          label="Wrong or partial"
          value={result.review.length - result.correct - result.unanswered}
        />
        <Metric label="Unattempted" value={result.unanswered} />
      </div>
      {result.answersWithheld && (
        <p className="st-release-note" role="note">
          <EyeOff size={16} aria-hidden="true" />
          <span>
            <strong>{releaseLabel(result.answersReleaseAt)}</strong> Until then
            you see your total score only. The answer key, marks for each
            question and section, feedback and the AI diagnosis appear then,
            so classmates still taking this test cannot work them out.
          </span>
        </p>
      )}
      <div className="st-two-col">
        <div>
          {!!result.sections?.length && (
            <Panel
              title="Section by section"
              subtitle="Marks earned in each section of this test."
            >
              <SectionBars sections={result.sections} />
            </Panel>
          )}
          <Panel title="Question by question">
            {result.review.map((question, index) => (
              <details className="st-question-review" key={question.id}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <small>{question.section}</small>
                    <strong>{question.question}</strong>
                  </div>
                  <span className="st-tag">
                    {question.state === undefined
                      ? "Answer saved"
                      : `${question.state} · ${question.score}/${question.marks}`}
                  </span>
                </summary>
                <div>
                  <h3>Your answer</h3>
                  <p className="st-preserve">
                    {question.selectedText || "Not answered"}
                  </p>
                  {question.expected === undefined ? (
                    <p className="st-muted">
                      {releaseLabel(result.answersReleaseAt)}
                    </p>
                  ) : (
                    <>
                      <h3>Expected answer or points</h3>
                      <p className="st-preserve">{question.expected}</p>
                      {question.feedback && (
                        <>
                          <h3>What to learn</h3>
                          <p className="st-muted">{question.feedback}</p>
                        </>
                      )}
                    </>
                  )}
                </div>
              </details>
            ))}
          </Panel>
        </div>
        <div>
          <Panel
            title="AI performance diagnosis"
            subtitle="Strengths, gaps and next steps tied to specific questions."
          >
            <Diagnosis
              attemptId={initial.id}
              result={result}
              initial={initial.insights}
            />
          </Panel>
          {result.answersWithheld ? (
            <Panel title="Sections and next steps">
              <p className="st-muted">
                Section marks, strengths and practice suggestions are worked
                out from each question&apos;s marks, so they appear with the
                answer key. {releaseLabel(result.answersReleaseAt)}
              </p>
            </Panel>
          ) : (
            <>
              <Panel title="What worked">
                {result.strengths?.length ? (
                  <ul className="st-bullets">
                    {result.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="st-muted">
                    Your next attempt is an opportunity to establish strengths.
                  </p>
                )}
              </Panel>
              <Panel title="Where to focus next">
                {result.recommendations?.length ? (
                  result.recommendations.map((item, index) => (
                    <Link
                      className="st-recommendation-link"
                      key={index}
                      href={`/student/friday?prompt=${encodeURIComponent(item)}`}
                    >
                      {item}
                      <ChevronRight size={15} aria-hidden="true" />
                    </Link>
                  ))
                ) : (
                  <p className="st-muted">
                    All questions received full marks. Try a more challenging
                    level.
                  </p>
                )}
              </Panel>
            </>
          )}
          <Panel title="Submission details">
            <dl className="st-details">
              <div>
                <dt>Student</dt>
                <dd>{initial.official.name}</dd>
              </div>
              <div>
                <dt>USN</dt>
                <dd>{initial.official.usn}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>
                  <DateLabel value={result.submittedAt} />
                </dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{durationLabel(result.durationSeconds)}</dd>
              </div>
            </dl>
            {result.integrity.length > 0 && (
              <details style={{ marginTop: 18 }}>
                <summary>
                  {result.integrity.length} recorded browser events
                  {integrityCounts(result.integrity).high
                    ? ` · ${integrityCounts(result.integrity).high} high-risk`
                    : ""}
                </summary>
                <ul className="st-event-list">
                  {result.integrity.map((event, index) => {
                    const severity = event.severity || severityOf(event.kind);
                    return (
                      <li key={index}>
                        <span className={`st-chip st-severity-${severity}`}>
                          {severity}
                        </span>
                        <span>
                          {EVENT_LABELS[event.kind] || event.kind} ·{" "}
                          <DateLabel value={event.at} />
                          {event.seconds
                            ? ` · ${event.seconds} inactive seconds`
                            : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
            <p className="st-muted" style={{ marginTop: 15 }}>
              Browser events are review signals, not proof of misconduct.
            </p>
          </Panel>
          <div className="st-actions">
            <Link
              className="st-button"
              href={
                result.category
                  ? `/student/assessments/${result.category}`
                  : "/student/ai-mock-test"
              }
            >
              Practise again ↗
            </Link>
            <Link
              className="st-button st-button-secondary"
              href="/student/assessments"
            >
              Assessment history
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
export type PracticeFormat = {
  level: number;
  questions: number;
  written: number;
  durationMinutes: number;
};
export type PracticeData = {
  categories: Record<string, { name: string; focus: string }>;
  levels?: string[];
  formats?: Record<string, PracticeFormat[]>;
  progress: {
    category: string;
    level: number;
    best: number;
    attempts: number;
  }[];
  // Unfinished practice attempts; reopening the level resumes the same paper.
  active?: { category: string; level: number; attempt: string }[];
};
const CATEGORY_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  aptitude: Gauge,
  reasoning: BrainCircuit,
  "data-interpretation": Activity,
  "business-communication": BookOpen,
  "case-analysis": Layers,
  "management-basics": GraduationCap,
};
function CategoryIcon({ id }: { id: string }) {
  const Icon = CATEGORY_ICONS[id] || ClipboardCheck;
  return (
    <span className="st-practice-icon" aria-hidden="true">
      <Icon size={20} />
    </span>
  );
}
/** L1–L5 ladder with each level's name; earned levels come from results. */
function LevelLadder({
  labels,
  earned = [],
}: {
  labels: readonly string[];
  earned?: boolean[];
}) {
  return (
    <ol className="st-level-ladder">
      {labels.map((label, index) => (
        <li key={label} data-earned={!!earned[index]}>
          <span aria-hidden="true">{earned[index] ? "✓" : index + 1}</span>
          <small>
            {levelLabel(index + 1, labels)}
            {earned[index] && (
              <span className="st-visually-hidden"> · earned</span>
            )}
          </small>
        </li>
      ))}
    </ol>
  );
}
export function AssessmentHub({
  data,
  history,
}: {
  data: PracticeData;
  history: AttemptHistory[];
}) {
  return (
    <>
      <PageTitle
        title="Build confidence, one level at a time."
        description="Choose a practice area or open your assigned assessment."
      />
      <div className="st-two-col">
        <Link className="st-link-card" href="/student/assessments/faculty-test">
          <LockKeyhole size={27} />
          <h2>Your assigned test starts here.</h2>
          <p>
            Enter the six-digit class code shared by your placement office.
            Timing and batch access are verified on the server.
          </p>
          <span>Enter class code ↗</span>
        </Link>
        <Panel title="A five-level practice path">
          <LevelLadder labels={data.levels || LEVEL_LABELS} />
          <p className="st-muted">
            Earn at least 70% at a level to unlock the next. Progress comes from
            completed attempts, never from opening a page.
          </p>
        </Panel>
      </div>
      <div className="st-grid">
        {Object.entries(data.categories).map(([id, category]) => (
          <Link
            className="st-link-card st-practice-card"
            data-category={id}
            href={`/student/assessments/${id}`}
            key={id}
          >
            <CategoryIcon id={id} />
            <span className="st-tag">
              {
                data.progress.filter(
                  (item) => item.category === id && item.best >= 70,
                ).length
              }
              /5 levels earned
            </span>
            <h2>{category.name}</h2>
            <p>{category.focus}</p>
            <span>Explore the practice path ↗</span>
          </Link>
        ))}
      </div>
      <AssessmentHistory history={history} />
    </>
  );
}
export function PracticeCategory({
  category,
  data,
}: {
  category: string;
  data: PracticeData;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null),
    [error, setError] = useState("");
  const info = data.categories[category],
    labels = data.levels || LEVEL_LABELS,
    earned = labels.map((_label, index) =>
      data.progress.some(
        (item) =>
          item.category === category &&
          item.level === index + 1 &&
          item.best >= 70,
      ),
    );
  if (!info)
    return (
      <Empty title="Practice category not found.">
        Choose a category from the Assessments hub.
      </Empty>
    );
  const start = async (level: number) => {
    setBusy(level);
    setError("");
    try {
      const paper = await studentFetch<{ id: string }>(
        `practice/${category}/${level}`,
        { method: "POST", body: {} },
      );
      const attempt = await studentFetch<{ id: string }>(
        `assessments/${paper.id}/start`,
        { method: "POST", body: { accepted: true } },
      );
      router.push(`/student/ai-mock-test/test?attempt=${attempt.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };
  return (
    <>
      <PageTitle
        title={info.name}
        description={info.focus}
        action={
          <Link
            href="/student/assessments"
            className="st-button st-button-secondary"
          >
            ← All categories
          </Link>
        }
      />
      <Panel
        title="A path with earned progress."
        className="st-practice-path"
      >
        <div className="st-practice-heading" data-category={category}>
          <CategoryIcon id={category} />
          <p className="st-muted">
            Each new attempt draws a fresh paper: new numbers, a different mix
            of items and shuffled options. An unfinished paper resumes exactly
            as you left it.
          </p>
        </div>
        <LevelLadder labels={labels} earned={earned} />
      </Panel>
      <ErrorNote message={error} />
      {labels.map((name, index) => {
        const level = index + 1,
          format = data.formats?.[category]?.[index],
          record = data.progress.find(
            (item) => item.category === category && item.level === level,
          ),
          open = data.active?.find(
            (item) => item.category === category && item.level === level,
          ),
          unlocked =
            level === 1 ||
            data.progress.some(
              (item) =>
                item.category === category &&
                item.level === level - 1 &&
                item.best >= 70,
            );
        return (
          <Panel key={name}>
            <div className="st-practice-level">
              <span className="st-level-number">L{level}</span>
              <div>
                <p className="st-eyebrow">LEVEL {level}</p>
                <h2>{name}</h2>
                <p className="st-muted">
                  {
                    [
                      "Definitions, direct formulas and one-step reasoning.",
                      "Apply a concept with careful reading.",
                      "Build accuracy under placement-style time pressure.",
                      "Work through combinations and business context.",
                      "Explain and decide with speed and clarity.",
                    ][index]
                  }
                </p>
                {format && (
                  <p className="st-practice-format">
                    {format.questions} questions
                    {format.written
                      ? ` · ${format.written} written answer evaluated by AI`
                      : ""}{" "}
                    · {format.durationMinutes} min
                  </p>
                )}
                <small className="st-muted">
                  {record
                    ? `Best: ${record.best}% · ${record.attempts} completed attempts`
                    : "No completed attempts yet"}
                  {open &&
                    " · Your unfinished paper is saved; its original deadline applies."}
                </small>
              </div>
              {open ? (
                <Link
                  className="st-button st-button-secondary"
                  href={`/student/ai-mock-test/test?attempt=${open.attempt}`}
                >
                  Resume paper ↗
                </Link>
              ) : (
                <button
                  className="st-button st-button-secondary"
                  disabled={!unlocked || busy !== null}
                  onClick={() => void start(level)}
                >
                  {busy === level
                    ? "Preparing…"
                    : !unlocked
                      ? "Complete the previous level"
                      : "Practise ↗"}
                </button>
              )}
            </div>
          </Panel>
        );
      })}
    </>
  );
}
function HistoryFigures({ item }: { item: AttemptHistory }) {
  const flags = item.integritySummary ||
    item.result?.integritySummary ||
    integrityCounts(item.result?.integrity);
  return (
    <div className="st-history-figures">
      <strong>
        {item.result ? `${item.result.percentage}%` : item.status}
        <span aria-hidden="true"> ↗</span>
      </strong>
      {item.result && (
        <small>
          {item.result.score} / {item.result.maximum} marks ·{" "}
          {durationLabel(item.result.durationSeconds)}
        </small>
      )}
      {(item.result || flags.total > 0) && (
        <small>
          {flags.total} browser {flags.total === 1 ? "event" : "events"}
        </small>
      )}
      {flags.high > 0 && (
        <span className="st-chip st-chip-bad">{flags.high} high-risk</span>
      )}
      {item.result?.answersWithheld && (
        <small>{releaseLabel(item.answersReleaseAt)}</small>
      )}
    </div>
  );
}
export function AssessmentHistory({ history }: { history: AttemptHistory[] }) {
  return (
    <Panel
      title="Your assessment history"
      subtitle="Saved attempts, original deadlines and completed results."
    >
      {history.length ? (
        <div className="st-list">
          {history.map((item) => (
            <Link
              className="st-list-row"
              key={item.id}
              href={`/student/ai-mock-test/${item.status === "active" ? "test" : "result"}?attempt=${item.id}`}
            >
              <div>
                <span className="st-tag">{item.kind}</span>
                <p>{item.title}</p>
                <small>
                  <DateLabel value={item.submitted_at || item.started_at} />
                </small>
              </div>
              <HistoryFigures item={item} />
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="Your first result is ahead of you.">
          Completed assessments and active attempts will appear here.
        </Empty>
      )}
    </Panel>
  );
}
export function AssignedTests({ history }: { history: AttemptHistory[] }) {
  const router = useRouter();
  const [code, setCode] = useState(""),
    [test, setTest] = useState<{
      id: string;
      title: string;
      count: number;
      batch: string;
      closes_at: string;
      creator?: string | null;
      config: {
        className: string;
        portions: string;
        durationMinutes: number;
        fullscreen: boolean;
        difficulty?: string;
        revealAnswers?: "after_close" | "immediately";
      };
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const unlock = async () => {
    setBusy(true);
    setError("");
    try {
      setTest(
        await studentFetch("assigned/unlock", {
          method: "POST",
          body: { code },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const start = async () => {
    if (!test) return;
    setBusy(true);
    setError("");
    try {
      if (test.config.fullscreen) {
        if (!document.documentElement.requestFullscreen)
          throw Error(
            "A supported fullscreen browser is required for this assessment.",
          );
        await document.documentElement.requestFullscreen();
      }
      const attempt = await studentFetch<{ id: string }>(
        `assessments/${test.id}/start`,
        { method: "POST", body: { accepted: true, code } },
      );
      router.push(`/student/ai-mock-test/test?attempt=${attempt.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        title="Your class code. Your next challenge."
        description="Assigned assessments, with clear instructions and saved results."
      />
      <Panel>
        <div className="st-code-console">
          <div>
            <div className="st-ai-orbit">
              <LockKeyhole size={35} />
            </div>
            <p className="st-eyebrow">ASSIGNED ASSESSMENT ACCESS</p>
            <h2>A focused space to show what you know.</h2>
            <p className="st-muted">
              Your placement office shares a six-digit code. The server verifies
              the batch, publication and assessment window.
            </p>
          </div>
          <div className="st-form">
            <label>
              Six-digit class code
              <input
                className="st-code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ""));
                  setTest(null);
                }}
                placeholder="000000"
              />
            </label>
            <ErrorNote message={error} />
            <button
              className="st-button"
              disabled={busy || code.length !== 6}
              onClick={() => void unlock()}
            >
              {busy ? "Verifying access…" : "Unlock assessment ↗"}
            </button>
          </div>
        </div>
      </Panel>
      {test && (
        <Panel
          title={test.title}
          subtitle={`${test.config.className} · Batch ${test.batch}`}
        >
          {test.creator && (
            <p className="st-muted st-assigned-author">
              Set by {test.creator}
            </p>
          )}
          <div className="st-metrics">
            <Metric label="Questions" value={test.count} />
            <Metric
              label="Duration"
              value={`${test.config.durationMinutes} min`}
            />
            <Metric
              label="Difficulty"
              value={difficultyLabel(test.config.difficulty)}
            />
            <Metric
              label="Mode"
              value={
                test.config.fullscreen ? "Browser integrity checks" : "Practice"
              }
            />
            <Metric
              label="Closes"
              value={
                <span style={{ fontSize: 16 }}>
                  <DateLabel value={test.closes_at} />
                </span>
              }
            />
          </div>
          <div className="st-portions">
            <h3>Covered portions</h3>
            {portionChips(test.config.portions).length ? (
              <ul className="st-opportunity-chips">
                {portionChips(test.config.portions).map((portion) => (
                  <li key={portion} className="st-chip">
                    {portion}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="st-muted">As described by your placement office.</p>
            )}
          </div>
          <ul className="st-bullets">
            <li>
              Move between questions, mark items and review before submitting.
            </li>
            <li>
              The original server deadline remains in force after a reload. Time
              expiry submits the last saved answers.
            </li>
            {test.config.fullscreen && (
              <li>
                Fullscreen exits and clipboard attempts (high), tab changes and
                inactivity (medium) and window focus changes (low) are recorded.
                No decorative face-detection status is used.
              </li>
            )}
            <li>
              {test.config.revealAnswers === "immediately"
                ? "Your score, the answer key and feedback appear as soon as you submit."
                : `Your total score appears when you submit; question and section marks, the answer key and feedback follow when the test closes. ${releaseLabel(test.closes_at)}`}
            </li>
            <li>
              Your placement office can review the submitted score and recorded
              browser events.
            </li>
          </ul>
          <button
            className="st-button"
            disabled={busy}
            onClick={() => void start()}
          >
            Start assigned test ↗
          </button>
        </Panel>
      )}
      <AssessmentHistory
        history={history.filter((item) => item.kind === "assigned")}
      />
    </>
  );
}
