"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search, History, ArrowLeft, ArrowRight } from "lucide-react";
import { DateLabel } from "./UI";
import type { InterviewStats } from "../lib/interview-types";
export type SessionPage = { rows: InterviewStats["recent"]; page: number; hasMore: boolean };
export function InterviewSessions({ initial, search = "", status = "all" }: { initial: SessionPage; search?: string; status?: string }) {
  const router = useRouter();
  const [term, setTerm] = useState(search), [state, setState] = useState(status);
  const href = (page: number) => "/student/interview?" + new URLSearchParams({ view: "sessions", search, status, page: String(page) });
  return <div><header className="iw-page-heading"><div><p className="iw-eyebrow">EVERY CONVERSATION, ONE PLACE</p><h1>Sessions & reports</h1><p>Resume practice and turn each completed interview into your next improvement.</p></div></header>
    <form className="iw-session-filters" onSubmit={(event) => { event.preventDefault(); router.push("/student/interview?" + new URLSearchParams({ view: "sessions", search: term, status: state, page: "1" })); }}><label><Search size={16} /><input aria-label="Search sessions" value={term} maxLength={100} onChange={(e) => setTerm(e.target.value)} placeholder="Search your sessions…" /></label><select aria-label="Session status" value={state} onChange={(e) => setState(e.target.value)}><option value="all">All sessions</option><option value="active">In progress</option><option value="completed">Completed</option><option value="terminated">Ended by integrity rules</option></select><button className="st-button">Apply filters</button></form>
    <section className="iw-chart-card">{initial.rows.length ? <div className="iw-session-rows">{initial.rows.map((session) => <Link key={session.id} href={`/student/interview/${session.status === "active" ? "session" : "report"}/${session.id}${session.status === "active" ? "" : "?open=1"}`}><span className="iw-small-icon"><History size={18} /></span><div><strong>{session.title}</strong><small><DateLabel value={session.ended_at || session.started_at} /> · {session.mode === "mock" ? "Coached practice" : "Proctored AI"}</small></div><span className="iw-status" data-status={session.status}>{session.status === "active" ? "In progress" : session.status}</span><strong className="iw-row-score">{session.report?.scores.overall == null ? "Not scored" : `${session.report.scores.overall}/10`}</strong><span className="iw-session-cta">{session.status === "active" ? "Resume" : "View analysis"}<ArrowUpRight size={14} /></span></Link>)}</div> : <div className="iw-no-sessions"><History size={30} strokeWidth={1.3} /><h2>No matching sessions yet.</h2><p>Start an interview or try a different search.</p><Link className="st-button" href="/student/interview?view=library">Browse your interviews</Link></div>}</section>
    <nav className="iw-pagination" aria-label="Session pages">{initial.page > 1 ? <Link className="st-button st-button-secondary" href={href(initial.page - 1)}><ArrowLeft size={14} />Previous</Link> : <span />}<span>Page {initial.page}</span>{initial.hasMore ? <Link className="st-button st-button-secondary" href={href(initial.page + 1)}>Next<ArrowRight size={14} /></Link> : <span />}</nav>
  </div>;
}
