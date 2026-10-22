"use client";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CornerDownRight,
  Minus,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import type {
  AnswerFeedback,
  InterviewReport,
  PlanContext,
} from "../lib/interview-types";
import {
  compareFeedback,
  isScoredFeedback,
  scoredDimensions,
  DIMENSION_LABELS,
  DIMENSIONS,
  type NetworkState,
} from "../lib/interview-insights";
import { Progress } from "./UI";

type FeedbackLike = Partial<AnswerFeedback> | null | undefined;
const STAR_KEYS = ["situation", "task", "action", "result"] as const;
const label = (key: string) => key[0].toUpperCase() + key.slice(1);

// Live network estimate from the latest timed probe. Nothing is stored.
export function NetworkChip({ network }: { network: NetworkState }) {
  const detail =
    "mbps" in network && network.ms !== null
      ? `${network.label} · ${network.ms} ms probe`
      : network.label;
  return (
    <span
      className="st-net-chip"
      data-state={network.state}
      title="Measured by timing a small download from campus services every 20 seconds."
    >
      {network.state === "offline" ? (
        <WifiOff size={13} aria-hidden="true" />
      ) : (
        <Wifi size={13} aria-hidden="true" />
      )}
      <span className="st-visually-hidden">Network: </span>
      {detail}
    </span>
  );
}

function StarRow({ star }: { star: NonNullable<AnswerFeedback["star"]> }) {
  return (
    <div className="st-star-row" aria-label="STAR structure">
      {STAR_KEYS.map((key) => (
        <span key={key} data-present={star[key] ? "true" : "false"}>
          {star[key] ? (
            <Check size={11} aria-hidden="true" />
          ) : (
            <X size={11} aria-hidden="true" />
          )}
          {label(key)}
          <span className="st-visually-hidden">
            {star[key] ? " present" : " missing"}
          </span>
        </span>
      ))}
      {star.score !== null && <small>STAR {star.score}/10</small>}
    </div>
  );
}

// Compact rubric for the live room and per-answer report view.
export function FeedbackSummary({
  feedback,
  compact = false,
}: {
  feedback: FeedbackLike;
  compact?: boolean;
}) {
  if (!feedback?.scores)
    return (
      <p className="st-muted">
        This answer is saved but has not been evaluated yet.
      </p>
    );
  if (!isScoredFeedback(feedback))
    return (
      <div className="st-turn-note">
        <span className="st-tag">NOT SCORED</span>
        <p>
          {feedback.turn?.reason ||
            "The interviewer did not treat this turn as an answer."}
        </p>
        <small className="st-muted">
          Unscored turns are not counted in your averages.
        </small>
      </div>
    );
  const dimensions = scoredDimensions(feedback).filter(
    (item) => item.key !== "overall",
  );
  return (
    <div className="st-feedback-summary">
      <div className="st-feedback-head">
        <strong>
          {feedback.scores.overall}
          <small>/10</small>
        </strong>
        <span className="st-quality" data-quality={feedback.quality}>
          {feedback.quality}
        </span>
        {feedback.turn?.kind === "partial" && (
          <span className="st-tag">PARTLY ANSWERED</span>
        )}
      </div>
      <dl className={`st-dimension-grid${compact ? " st-compact" : ""}`}>
        {dimensions.map((item) => (
          <div key={item.key}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {feedback.star?.applicable && <StarRow star={feedback.star} />}
      {feedback.star?.applicable && feedback.star.feedback && (
        <p className="st-muted">{feedback.star.feedback}</p>
      )}
    </div>
  );
}

// Original answer vs. practice retry. Only dimensions scored in both appear.
export function RetryComparison({
  original,
  retry,
}: {
  original: FeedbackLike;
  retry: FeedbackLike;
}) {
  const comparison = compareFeedback(original, retry);
  if (!comparison)
    return (
      <p className="st-muted">
        A comparison appears once both the original answer and the retry have
        been scored.
      </p>
    );
  const { quality } = comparison;
  return (
    <div className="st-retry-compare">
      <p className="st-eyebrow">ORIGINAL → PRACTICE RETRY</p>
      <p className="st-retry-quality">
        {quality.before} → {quality.after}
        <span data-direction={quality.direction}>
          {quality.direction === "up"
            ? "Quality improved"
            : quality.direction === "down"
              ? "Quality dropped"
              : quality.direction === "same"
                ? "Same quality level"
                : ""}
        </span>
      </p>
      <ul>
        {comparison.dimensions.map((item) => (
          <li key={item.key} data-change={Math.sign(item.change)}>
            <span>{item.label}</span>
            <span>
              {item.before} → {item.after}
            </span>
            <strong>
              {item.change > 0 ? (
                <ArrowUp size={12} aria-hidden="true" />
              ) : item.change < 0 ? (
                <ArrowDown size={12} aria-hidden="true" />
              ) : (
                <Minus size={12} aria-hidden="true" />
              )}
              {item.change > 0 ? `+${item.change}` : item.change}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Per-dimension averages over scored answers; legacy reports show their four.
// Dimensions no scored answer measured (for example, feedback saved before
// the fuller rubric) are left out rather than shown as empty bars.
export function DimensionBars({ report }: { report: InterviewReport }) {
  const measured = DIMENSIONS.flatMap((key) => {
    const value = report.dimensions?.[key];
    return typeof value === "number" ? [[key, value] as const] : [];
  });
  const values: (readonly [string, number | null])[] = measured.length
    ? measured
    : (Object.entries(report.scores) as [string, number | null][]);
  return (
    <>
      {values.map(([key, value]) => (
        <Progress
          key={key}
          label={DIMENSION_LABELS[key as keyof typeof DIMENSION_LABELS] || label(key)}
          value={value === null ? null : value * 10}
        />
      ))}
    </>
  );
}

export function StarCoverage({ star }: { star: InterviewReport["star"] }) {
  if (!star)
    return (
      <p className="st-muted">
        No scored behavioural answers in this session, so STAR structure was
        not assessed.
      </p>
    );
  return (
    <div className="st-star-coverage">
      <p>
        {star.complete} of {star.answers} behavioural{" "}
        {star.answers === 1 ? "answer" : "answers"} covered all four STAR
        elements
        {star.score !== null ? ` · average STAR score ${star.score}/10` : ""}.
      </p>
      <dl className="st-dimension-grid">
        {STAR_KEYS.map((key) => (
          <div key={key}>
            <dt>{label(key)}</dt>
            <dd>
              {star.elements[key]}/{star.answers}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const hasReading = (context: PlanContext | undefined) =>
  !!context &&
  !!(
    context.objective ||
    context.jdSummary ||
    context.resumeSummary ||
    context.sections?.length
  );

function ReadingList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3>{title}</h3>
      <ul className="st-bullets">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// What the AI read from the student's own documents when planning. There is
// deliberately no alignment or fit score here.
export function PlanReading({ context }: { context?: PlanContext }) {
  if (!hasReading(context))
    return (
      <p className="st-muted">
        No AI reading of documents is saved for this plan. Plans you write
        yourself, and plans created before this feature, do not have one.
        Add a JD or resume when creating an AI plan to see one.
      </p>
    );
  const reading = context as PlanContext;
  return (
    <div className="st-plan-reading">
      {reading.objective && <p>{reading.objective}</p>}
      <div className="st-plan-reading-grid">
        <section aria-label="Job description">
          <p className="st-eyebrow">FROM YOUR JD</p>
          {reading.jdSummary ? (
            <p className="st-muted">{reading.jdSummary}</p>
          ) : (
            <p className="st-muted">No job description was supplied.</p>
          )}
          <ReadingList
            title="Responsibilities"
            items={reading.responsibilities}
          />
          <ReadingList title="Must-have skills" items={reading.mustHaveSkills} />
        </section>
        <section aria-label="Resume">
          <p className="st-eyebrow">FROM YOUR RESUME</p>
          {reading.resumeSummary ? (
            <p className="st-muted">{reading.resumeSummary}</p>
          ) : (
            <p className="st-muted">No resume was supplied.</p>
          )}
          <ReadingList title="Evidence to lean on" items={reading.strengths} />
          <ReadingList title="Gaps to prepare for" items={reading.risks} />
        </section>
      </div>
      {!!reading.sections?.length && (
        <ol className="st-plan-sections">
          {reading.sections.map((section, index) => (
            <li key={index}>
              <CornerDownRight size={13} aria-hidden="true" />
              <div>
                <strong>{section.name}</strong>
                <small>
                  {section.questionCount}{" "}
                  {section.questionCount === 1 ? "question" : "questions"}
                </small>
                <p className="st-muted">{section.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <small className="st-muted">
        An AI summary of the documents you provided, used to tailor questions.
        It is not an assessment of your fit for the role.
      </small>
    </div>
  );
}
