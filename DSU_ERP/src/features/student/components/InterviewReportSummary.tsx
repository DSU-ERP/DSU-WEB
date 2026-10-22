"use client";
import { ArrowDown, ArrowUpRight, CheckCircle2, Target, Printer } from "lucide-react";
import type { InterviewSession } from "../lib/interview-types";
import { DIMENSION_LABELS, isScoredFeedback, questionLabels } from "../lib/interview-insights";
export function InterviewReportSummary({ session, onSelect }: { session: InterviewSession; onSelect: (index: number) => void }) {
  const report = session.report;
  const answers = session.answers || [];
  const score = report?.scores.overall;
  const dimensions = Object.entries(report?.dimensions || report?.scores || {}).filter(([key, value]) => key !== "overall" && typeof value === "number") as [keyof typeof DIMENSION_LABELS, number][];
  dimensions.sort((a, b) => b[1] - a[1]);
  const strongest = dimensions[0];
  const focus = dimensions.at(-1);
  const duration = session.ended_at ? Math.max(0, Math.round((Date.parse(session.ended_at) - Date.parse(session.started_at)) / 60000)) : null;
  const labels = questionLabels(session.questions);
  return <>
    <nav className="iw-report-nav" aria-label="Report sections"><a href="#ir-overview">Overview</a><a href="#ir-breakdown">Rubric breakdown</a><a href="#ir-coaching">Answer coaching</a><button type="button" onClick={() => window.print()}><Printer size={14} />Print / save PDF</button></nav>
    <section className="iw-report-summary" id="ir-overview" aria-label="Interview summary">
      <div className="iw-report-score"><div className="iw-score-ring" style={{ background: `conic-gradient(var(--iw-accent) ${(score ?? 0) * 10}%, var(--iw-line) 0)` }}><span><strong>{score == null ? "—" : score}</strong><small>{score == null ? "Not scored" : "out of 10"}</small></span></div><div><p className="iw-eyebrow">OVERALL AI RUBRIC</p><h2>{score == null ? "Your evidence comes first." : score >= 9 ? "Keep building on this." : score >= 7.5 ? "A strong foundation." : score >= 6 ? "Progress you can build on." : "A useful place to start."}</h2><p>{report?.basis || "No scored feedback is available for this session yet."}</p></div></div>
      <dl className="iw-report-facts"><div><dt>Answers saved</dt><dd>{report?.answered ?? answers.length}</dd></div><div><dt>Answers scored</dt><dd>{report?.graded ?? 0}</dd></div><div><dt>Pending evaluation</dt><dd>{report?.pending ?? 0}</dd></div><div><dt>Practice time</dt><dd>{duration == null ? "—" : `${duration} min`}</dd></div></dl>
    </section>
    <div className="iw-report-takeaways"><article><CheckCircle2 size={20} /><div><p>Strongest measured dimension</p><h3>{strongest ? DIMENSION_LABELS[strongest[0]] : "Not measured yet"}{strongest && <span>{strongest[1]}/10</span>}</h3><small>{report?.strengths[0] || "Your evaluated answers will provide the evidence."}</small></div></article><article><Target size={20} /><div><p>A useful next focus</p><h3>{focus ? DIMENSION_LABELS[focus[0]] : "Complete a scored answer"}{focus && <span>{focus[1]}/10</span>}</h3><small>{report?.improvements[0] || "Specific next steps appear once feedback is available."}</small></div></article></div>
    {answers.length > 0 && <section className="iw-answer-performance" aria-labelledby="ir-answer-title"><header><div><h2 id="ir-answer-title">Every answer tells part of the story.</h2><p>Select an answer to explore its transcript, rubric, retries and coaching.</p></div><ArrowDown size={17} /></header><div>{answers.map((answer, index) => {
      const label = labels[answer.question_index];
      const scored = isScoredFeedback(answer.feedback);
      const value = scored ? answer.feedback.scores?.overall : null;
      return <button key={answer.id} onClick={() => onSelect(index)}><span>{label?.followUp ? `Q${label.number} follow-up` : `Question ${label?.number ?? answer.question_index + 1}`}<ArrowUpRight size={13} /></span><strong>{value == null ? "—" : value}<small>{value == null ? answer.feedback.scores ? "not scored" : "pending" : "/10"}</small></strong><progress value={value ?? 0} max={10} aria-label={`${label?.followUp ? "Follow-up" : "Question"} ${label?.number ?? answer.question_index + 1}: ${value == null ? "not scored" : value + " out of 10"}`} /><p>{answer.focus || session.questions?.[answer.question_index]?.focus || "Interview answer"}</p></button>;
    })}</div></section>}
  </>;
}
