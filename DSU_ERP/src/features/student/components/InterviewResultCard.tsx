"use client";
import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FileChartColumn, LoaderCircle, X } from "lucide-react";
import { DateLabel } from "./UI";
import type { InterviewSession } from "../lib/interview-types";

const ReportDetails = lazy(() => import("./InterviewReport").then(module => ({ default: module.InterviewResults })));

export function InterviewResultCard({ initial, autoOpen = false }: { initial: InterviewSession; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen), [loaded, setLoaded] = useState(autoOpen);
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const score = initial.report?.scores.overall;
  if (initial.status === "active") return <section className="iw-result-landing"><h1>Your interview is still in progress.</h1><p>Your report will be available after the interview ends.</p><Link className="st-button" href={`/student/interview/session/${initial.id}`}>Resume interview</Link></section>;
  return <div className="iw-result-landing">
    <header><span className="iw-result-complete"><CheckCircle2 size={23} /></span><h1>{initial.status === "terminated" ? "Your interview has ended." : "Your interview is complete."}</h1><p>Your answers are saved. Open your results for the complete analysis.</p></header>
    {initial.termination_reason && <p className="st-error">{initial.termination_reason}</p>}
    <button type="button" className="iw-result-card" aria-label="View interview results" aria-haspopup="dialog" onClick={() => { setLoaded(true); setOpen(true); }}>
      <span className="iw-result-card-top"><span className="iw-result-file"><FileChartColumn size={22} /></span><span><strong>{initial.title}</strong><small><DateLabel value={initial.ended_at || initial.started_at} /> · {initial.mode === "mock" ? "Coached practice" : "Proctored AI"}</small></span><ArrowUpRight size={20} /></span>
      <span className="iw-result-card-score"><strong>{score == null ? "—" : score}<small>{score == null ? "Not scored" : "/ 10"}</small></strong><span>Overall AI rubric<small>Practice guidance, based on your answers</small></span></span>
      <span className="iw-result-card-facts"><span><strong>{initial.report?.answered ?? initial.answers?.length ?? 0}</strong> answers saved</span><span><strong>{initial.report?.graded ?? 0}</strong> scored</span><span><strong>{initial.report?.pending ?? 0}</strong> pending</span></span>
      <span className="iw-result-card-cta">View results & breakdown<ArrowUpRight size={16} /></span>
    </button>
    <div className="iw-result-next"><Link className="st-button" href="/student/interview?view=create">New interview</Link><Link className="iw-text-link" href="/student/interview?view=sessions">All sessions</Link></div>
    <dialog ref={dialog} className="iw-result-dialog" aria-labelledby={headingId} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={event => { if (event.target === dialog.current) setOpen(false); }}>
      <div className="iw-result-dialog-header"><div><h2 id={headingId}>Interview results</h2><p>{initial.title}</p></div><button type="button" aria-label="Close interview results" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <div className="iw-result-dialog-body">{loaded && <Suspense fallback={<div className="iw-result-loading" role="status"><LoaderCircle size={22} className="iw-spinner" />Opening your analysis…</div>}><ReportDetails key={initial.id} initial={initial} /></Suspense>}</div>
    </dialog>
  </div>;
}
