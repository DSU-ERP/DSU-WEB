"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { InterviewReportSummary } from "./InterviewReportSummary";
import { plural } from "../lib/progress";
import { studentFetch } from "../lib/client";
import { INTEGRITY_LABELS, isScoredFeedback, questionLabels } from "../lib/interview-insights";
import { DimensionBars, FeedbackSummary, RetryComparison, StarCoverage } from "./InterviewInsights";
import { PageTitle, Panel, Metric, Empty, ErrorNote, DateLabel } from "./UI";
import type { Coaching, InterviewSession } from "../lib/interview-types";
const COACHING_ACTIONS = [
  "Ideal Answer",
  "Improve My Answer",
  "STAR Version",
  "Concise Version",
  "Placement-Ready",
  "Recruiter Expectations",
  "Mistake Breakdown",
];
export function InterviewResults({ initial }: { initial: InterviewSession }) {
  const router = useRouter();
  const answers = initial.answers || [],
    report = initial.report;
  const [selected, setSelected] = useState(0),
    [action, setAction] = useState("Improve My Answer"),
    [coaching, setCoaching] = useState<Coaching | null>(null),
    // Coaching saved on the server, per answer and mode.
    [saved, setSaved] = useState<Record<string, Record<string, Coaching>>>(
      () =>
        Object.fromEntries(
          answers.map((answer) => [answer.id, answer.coaching || {}]),
        ),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const current = answers[selected];
  const selectedAnswer = useRef(current?.id);
  const coachingRequest = useRef(false);
  selectedAnswer.current = current?.id;
  const coach = async (nextAction = action, regenerate = false) => {
    if (!current || coachingRequest.current) return;
    setAction(nextAction);
    setError("");
    const cached = saved[current.id]?.[nextAction];
    if (cached && !regenerate) {
      setCoaching({ ...cached, cached: true });
      return;
    }
    setBusy(true);
    coachingRequest.current = true;
    try {
      const result = await studentFetch<Coaching>(
        `sessions/${initial.id}/coach`,
        {
          method: "POST",
          body: {
            questionIndex: current.question_index,
            action: nextAction,
            regenerate,
          },
        },
      );
      if (selectedAnswer.current === current.id) setCoaching(result);
      setSaved((all) => ({
        ...all,
        [current.id]: { ...all[current.id], [nextAction]: result },
      }));
    } catch (e) {
      if (selectedAnswer.current === current.id) setError((e as Error).message);
    } finally {
      coachingRequest.current = false;
      setBusy(false);
    }
  };
  if (initial.status === "active")
    return (
      <Panel>
        <Empty
          title="Your conversation is still open."
          href={`/student/interview/session/${initial.id}`}
          label="Return to session"
        >
          Reports and answer coaching are available after the session ends.
        </Empty>
      </Panel>
    );
  const questionOf = (index: number) => initial.questions?.[index];
  // Numbered by main question; a follow-up shares its parent's number.
  const labels = questionLabels(initial.questions);
  const qualities = Object.entries(report?.qualities || {});
  return (
    <div className="iw-report">
      <PageTitle
        title={
          initial.status === "terminated"
            ? "A session to reflect on."
            : "Your interview, decoded."
        }
        description={initial.title}
        action={
          <Link
            className="st-button st-button-secondary"
            href="/student/interview?view=library"
          >
            Back to interviews ↗
          </Link>
        }
      />
      {initial.termination_reason && (
        <ErrorNote message={initial.termination_reason} />
      )}
      <InterviewReportSummary session={initial} onSelect={(index) => { setSelected(index); setCoaching(null); setError(""); document.getElementById("ir-coaching")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }} />
      <div className="st-two-col" id="ir-breakdown">
        <Panel
          title="Your performance, explained"
          subtitle={report?.basis || "No rubric feedback is available yet."}
        >
          {report && <DimensionBars report={report} />}
          {qualities.length > 0 && (
            <p className="st-muted st-quality-counts">
              Quality levels:{" "}
              {qualities
                .map(([level, count]) => `${level} × ${count}`)
                .join(" · ")}
            </p>
          )}
          {(report?.pending || 0) > 0 && (
            <p className="st-error">
              {report?.pending} saved answers have not yet been evaluated. They
              are not counted as zero scores.{" "}
              <button
                className="st-button st-button-secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await studentFetch(`sessions/${initial.id}/evaluate`, {
                      method: "POST",
                      body: {},
                    });
                    router.refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Evaluate next saved answer
              </button>
            </p>
          )}
        </Panel>
        <div className="st-stack">
          <Panel title="Interview context">
            <dl className="st-details">
              {[
                ["Company", initial.config.company],
                ["Role", initial.config.role],
                [
                  "Mode",
                  initial.mode === "mock" ? "Coached mock" : "Proctored AI",
                ],
                ["Language", initial.config.language],
                [
                  "Configured duration",
                  plural(initial.config.durationMinutes, "minute"),
                ],
                [
                  "Completed",
                  initial.ended_at
                    ? new Date(initial.ended_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
                    : "Not recorded",
                ],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value || "Not supplied"}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel
            title="STAR structure"
            subtitle="Situation, task, action and result in scored behavioural answers."
          >
            <StarCoverage star={report?.star ?? null} />
          </Panel>
        </div>
      </div>
      <div className="st-grid">
        {[
          ["Strengths", report?.strengths],
          ["Improvement areas", report?.improvements],
          ["Next practice plan", report?.nextPlan],
        ].map(([title, items]) => (
          <Panel title={String(title)} key={String(title)}>
            {(items as string[] | undefined)?.length ? (
              <ul className="st-bullets">
                {(items as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="st-muted">
                No evaluated evidence recorded for this section.
              </p>
            )}
          </Panel>
        ))}
      </div>
      <section id="ir-coaching"><Panel title="One answer. A more useful next attempt.">
        <div className="st-coaching-grid">
          <aside>
            {answers.length ? (
              answers.map((answer, index) => {
                const question = questionOf(answer.question_index);
                const label = labels[answer.question_index];
                const followUp = !!label?.followUp;
                return (
                  <button
                    key={answer.id}
                    aria-current={selected === index ? "true" : undefined}
                    onClick={() => {
                      setSelected(index);
                      setCoaching(null);
                      setError("");
                    }}
                  >
                    <small>
                      {followUp
                        ? `Follow-up to question ${label?.number}`
                        : `Question ${label?.number ?? answer.question_index + 1}`}
                      {answer.feedback?.scores &&
                      !isScoredFeedback(answer.feedback)
                        ? " · not scored"
                        : ""}
                    </small>
                    <span>{question?.question || "Saved answer"}</span>
                  </button>
                );
              })
            ) : (
              <Empty title="No saved transcript is available.">
                Complete another session to receive answer-level coaching.
              </Empty>
            )}
          </aside>
          <div>
            {current && (
              <>
                <p className="st-eyebrow">ORIGINAL QUESTION</p>
                <h3>{questionOf(current.question_index)?.question}</h3>
                <p className="st-eyebrow" style={{ marginTop: 20 }}>
                  {current.retried ? "YOUR PRACTICE RETRY" : "YOUR SAVED ANSWER"}
                </p>
                <p className="st-preserve">{current.answer}</p>
                <div className="st-answer-rubric">
                  <FeedbackSummary feedback={current.feedback} />
                  {isScoredFeedback(current.feedback) &&
                    current.feedback.explanation && (
                      <p className="st-muted">{current.feedback.explanation}</p>
                    )}
                </div>
                {current.retried && (
                  <details className="st-retry-details">
                    <summary>Compare with your original answer</summary>
                    {current.original_answer && (
                      <p className="st-preserve st-muted">
                        {current.original_answer}
                      </p>
                    )}
                    <RetryComparison
                      original={current.original_feedback}
                      retry={current.feedback}
                    />
                  </details>
                )}
                <div className="st-coaching-actions">
                  {COACHING_ACTIONS.map((item) => {
                    const ready = !!saved[current.id]?.[item];
                    return (
                      <button
                        className="st-button st-button-secondary"
                        key={item}
                        disabled={busy}
                        aria-pressed={coaching !== null && action === item}
                        onClick={() => void coach(item)}
                      >
                        {item}
                        {ready && (
                          <>
                            <Check size={12} aria-hidden="true" />
                            <span className="st-visually-hidden">
                              {" "}
                              (saved)
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
                <ErrorNote message={error} />
                {busy && (
                  <p role="status" className="st-muted">
                    Preparing specific, useful coaching…
                  </p>
                )}
                {coaching && (
                  <div className="st-career-card">
                    <span className="st-tag">
                      {action}
                      {coaching.cached ? " · SAVED" : ""}
                    </span>
                    <h3>{coaching.title}</h3>
                    <p>{coaching.explanation}</p>
                    <ul className="st-bullets">
                      {coaching.points.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                    {coaching.rewrite && (
                      <blockquote className="st-preserve">
                        {coaching.rewrite}
                      </blockquote>
                    )}
                    <h3>Why this helps</h3>
                    <p className="st-muted">{coaching.why}</p>
                    <h3>Your next tip</h3>
                    <p className="st-muted">{coaching.nextTip}</p>
                    {coaching.generatedAt && (
                      <small className="st-muted">
                        Generated <DateLabel value={coaching.generatedAt} />
                      </small>
                    )}
                    <button
                      className="st-button st-button-secondary"
                      style={{ marginTop: 15 }}
                      disabled={busy}
                      onClick={() => void coach(action, true)}
                    >
                      Regenerate coaching ↗
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Panel>
      </section>
      {initial.integrity.length > 0 && (
        <Panel title="Recorded browser integrity events">
          <p className="st-muted">
            These are browser-reported events, not proof of identity or
            misconduct. Only warnings count toward the three-warning limit;
            information events never do.
          </p>
          {initial.integrity.map((event, index) => (
            <div className="st-list-row" key={index}>
              <p>
                {INTEGRITY_LABELS[event.kind]
                  ? INTEGRITY_LABELS[event.kind][0].toUpperCase() +
                    INTEGRITY_LABELS[event.kind].slice(1)
                  : event.kind.replaceAll("-", " ")}
              </p>
              <span className="st-tag">
                {(event.severity ||
                  (["inactive", "extended-display"].includes(event.kind)
                    ? "info"
                    : "warning")) === "info"
                  ? "INFORMATION"
                  : "WARNING"}
              </span>
              <small>
                <DateLabel value={event.at} />
              </small>
            </div>
          ))}
        </Panel>
      )}
      <section className="iw-print-transcript"><h2>Complete answer transcript</h2>{answers.map((answer) => <article key={answer.id}><h3>{questionOf(answer.question_index)?.question || answer.question || `Question ${answer.question_index + 1}`}</h3><p className="st-preserve">{answer.answer}</p><p>AI rubric: {isScoredFeedback(answer.feedback) && answer.feedback.scores?.overall != null ? `${answer.feedback.scores.overall}/10` : answer.feedback.scores ? "Not scored" : "Pending evaluation"}</p>{answer.feedback.explanation && <p>{answer.feedback.explanation}</p>}{answer.feedback.strengths?.length ? <p>Strengths: {answer.feedback.strengths.join(" · ")}</p> : null}{answer.feedback.improvements?.length ? <p>Improve: {answer.feedback.improvements.join(" · ")}</p> : null}</article>)}</section>
      <Link
        href={`/student/interview/${initial.interview_id}`}
        className="st-button"
      >
        Practise this interview again ↗
      </Link>
    </div>
  );
}
