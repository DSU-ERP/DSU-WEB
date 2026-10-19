"use client";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { studentFetch } from "../lib/client";
import { plural } from "../lib/progress";
import { useElapsed } from "../lib/useElapsed";
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
export type ReviewQuestion = Question & {
  answer: string;
  selectedText: string;
  expected: string;
  score: number;
  state: string;
  feedback: string;
};
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
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  review: ReviewQuestion[];
  kind: string;
  category: string | null;
  level: number | null;
  integrity: { kind: string; at: string; seconds: number }[];
  submittedAt: string;
  durationSeconds: number;
};
export type Attempt = {
  id: string;
  status: "active" | "submitted" | "completed";
  title: string;
  kind: string;
  config: { durationMinutes: number; fullscreen: boolean; difficulty: string };
  questions: Question[];
  answers: Record<string, string>;
  marked: string[];
  expires_at: string;
  revision: number;
  result: TestResult | null;
  integrity: { kind: string; at: string; seconds: number }[];
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
  result: TestResult | null;
  category: string | null;
  level: number | null;
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
  const count = sections.reduce((sum, item) => sum + item.count, 0),
    active = history.find(
      (item) => item.status === "active" && item.kind === "ai",
    );
  const waited = useElapsed(busy);
  const generate = async () => {
    setError("");
    if (
      context.trim().length < 10 ||
      !count ||
      count > 50 ||
      !sections.length
    ) {
      setError(
        "Add your topics or JD, at least one section and between one and 50 questions.",
      );
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
            <p>
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
            <div className="st-distribution" aria-label="Question distribution">
              {sections.map((section, index) => (
                <span
                  key={index}
                  style={{
                    flex: section.count || 1,
                    opacity: 0.45 + index * 0.15,
                  }}
                  title={`${section.name}: ${section.count} questions`}
                />
              ))}
            </div>
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
                      max={50}
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
            <ErrorNote message={error} />
            <button
              className="st-button"
              disabled={busy || count > 50}
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
    [events, setEvents] = useState(initial.integrity.length);
  const revision = useRef(initial.revision),
    queue = useRef<Promise<void>>(Promise.resolve()),
    submitting = useRef(false),
    latest = useRef(answers),
    firstSave = useRef(true),
    lastActivity = useRef(Date.now());
  latest.current = answers;
  const resultPath = `/student/ai-mock-test/result?attempt=${initial.id}`;
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
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => {});
      router.push(resultPath);
    } catch (e) {
      setError((e as Error).message);
      try {
        const saved = await studentFetch<Attempt>(`attempts/${initial.id}`);
        if (saved.status !== "active") {
          router.push(resultPath);
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
    let lastEvent = 0;
    const record = (kind: string, seconds = 0) => {
      if (Date.now() - lastEvent < 1500) return;
      lastEvent = Date.now();
      void studentFetch<{ events: number }>(
        `attempts/${initial.id}/integrity`,
        { method: "POST", body: { kind, seconds } },
      )
        .then((result) => setEvents(result.events))
        .catch(() => {});
    };
    const hidden = () => {
        if (document.hidden) record("tab-hidden");
      },
      fullscreen = () => {
        if (!document.fullscreenElement) record("fullscreen-exit");
      },
      clipboard = (e: Event) => {
        e.preventDefault();
        record("clipboard");
      },
      activity = () => {
        lastActivity.current = Date.now();
      };
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("fullscreenchange", fullscreen);
    for (const name of ["copy", "cut", "paste"])
      document.addEventListener(name, clipboard);
    document.addEventListener("keydown", activity);
    document.addEventListener("pointerdown", activity);
    const timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastActivity.current) / 1000);
      if (seconds >= 60) {
        record("inactive", Math.min(seconds, 3600));
        lastActivity.current = Date.now();
      }
    }, 10000);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("fullscreenchange", fullscreen);
      for (const name of ["copy", "cut", "paste"])
        document.removeEventListener(name, clipboard);
      document.removeEventListener("keydown", activity);
      document.removeEventListener("pointerdown", activity);
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
  const attempted = Object.values(answers).filter((value) =>
      value.trim(),
    ).length,
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
                Browser integrity events recorded: {events}. No face detection
                or identity verification is claimed.
              </span>
              <button
                onClick={() =>
                  void document.documentElement.requestFullscreen?.()
                }
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
                aria-label={`Question ${i + 1}${answers[q.id] ? ", answered" : ", unanswered"}${marked.includes(q.id) ? ", marked" : ""}`}
                aria-current={index === i ? "step" : undefined}
                data-answered={!!answers[q.id]}
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
            If an AI service was unavailable, you can retry without taking the
            test again.
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
              href="/student/assessments"
            >
              Back to assessments
            </Link>
          </div>
        </Panel>
      </>
    );
  return (
    <>
      <PageTitle
        title="A result you can learn from."
        description={`${result.title} · ${result.difficulty} · ${result.attempted} attempted`}
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
      <div className="st-two-col">
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
                  {question.state} · {question.score}/{question.marks}
                </span>
              </summary>
              <div>
                <h3>Your answer</h3>
                <p className="st-preserve">
                  {question.selectedText || "Not answered"}
                </p>
                <h3>Expected answer or points</h3>
                <p className="st-preserve">{question.expected}</p>
                <h3>What to learn</h3>
                <p className="st-muted">{question.feedback}</p>
              </div>
            </details>
          ))}
        </Panel>
        <div>
          <Panel title="What worked">
            {result.strengths.length ? (
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
            {result.recommendations.length ? (
              result.recommendations.map((item, index) => (
                <Link
                  className="st-recommendation-link"
                  key={index}
                  href={`/student/observation-haki?prompt=${encodeURIComponent(item)}`}
                >
                  {item}
                  <ChevronRight size={15} />
                </Link>
              ))
            ) : (
              <p className="st-muted">
                All questions received full marks. Try a more challenging level.
              </p>
            )}
          </Panel>
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
                <dd>{result.durationSeconds < 60 ? "Under a minute" : plural(Math.round(result.durationSeconds / 60), "minute")}</dd>
              </div>
            </dl>
            {result.integrity.length > 0 && (
              <details style={{ marginTop: 18 }}>
                <summary>
                  {result.integrity.length} recorded browser events
                </summary>
                <ul className="st-bullets">
                  {result.integrity.map((event, index) => (
                    <li key={index}>
                      {event.kind} · <DateLabel value={event.at} />
                      {event.seconds
                        ? ` · ${event.seconds} inactive seconds`
                        : ""}
                    </li>
                  ))}
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
export type PracticeData = {
  categories: Record<string, { name: string; focus: string }>;
  progress: {
    category: string;
    level: number;
    best: number;
    attempts: number;
  }[];
};
const LEVELS = [
  "Foundation",
  "Core application",
  "Placement standard",
  "Advanced mixed set",
  "Interview challenge",
];
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
          <div className="st-level-path">
            {LEVELS.map((_label, index) => (
              <span key={index}>{index + 1}</span>
            ))}
          </div>
          <p className="st-muted">
            Earn at least 70% at a level to unlock the next. Progress comes from
            completed attempts, never from opening a page.
          </p>
        </Panel>
      </div>
      <div className="st-grid">
        {Object.entries(data.categories).map(([id, category]) => (
          <Link
            className="st-link-card"
            href={`/student/assessments/${id}`}
            key={id}
          >
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
  const info = data.categories[category];
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
      <Panel title="A path with earned progress.">
        <div className="st-level-path">
          {LEVELS.map((_label, index) => (
            <span
              key={index}
              data-earned={data.progress.some(
                (item) =>
                  item.category === category &&
                  item.level === index + 1 &&
                  item.best >= 70,
              )}
            >
              {data.progress.some(
                (item) =>
                  item.category === category &&
                  item.level === index + 1 &&
                  item.best >= 70,
              )
                ? "✓"
                : index + 1}
            </span>
          ))}
        </div>
      </Panel>
      <ErrorNote message={error} />
      {LEVELS.map((name, index) => {
        const level = index + 1,
          record = data.progress.find(
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
              <span className="st-level-number">0{level}</span>
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
                <small className="st-muted">
                  {record
                    ? `Best: ${record.best}% · ${record.attempts} completed attempts`
                    : "No completed attempts yet"}
                </small>
              </div>
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
            </div>
          </Panel>
        );
      })}
    </>
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
              <div>
                <strong>
                  {item.result ? `${item.result.percentage}%` : item.status}
                </strong>
                <small>
                  {item.result
                    ? ` · ${item.result.integrity.length} recorded events`
                    : ""}{" "}
                  ↗
                </small>
              </div>
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
      config: {
        className: string;
        portions: string;
        durationMinutes: number;
        fullscreen: boolean;
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
          <div className="st-metrics">
            <Metric label="Questions" value={test.count} />
            <Metric
              label="Duration"
              value={`${test.config.durationMinutes} min`}
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
          <p className="st-muted">
            Covered portions:{" "}
            {test.config.portions || "As described by your placement office."}
          </p>
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
                Tab changes, fullscreen exits, clipboard attempts and inactivity
                are recorded. No decorative face-detection status is used.
              </li>
            )}
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
