import Link from "next/link";
import { Plus, ArrowUpRight, Mic, Clock3, MessageSquare, Layers } from "lucide-react";
import type { InterviewPlan, InterviewStats } from "../lib/interview-types";
import { interviewActivity } from "../lib/interview-activity";
import { DateLabel } from "./UI";

function ActivityChart({ days, metric, title }: { days: ReturnType<typeof interviewActivity>; metric: "sessions" | "minutes" | "answers"; title: string }) {
  const max = Math.max(3, Math.ceil(Math.max(0, ...days.map((day) => day[metric])) / 3) * 3);
  const total = days.reduce((sum, day) => sum + day[metric], 0);
  return <section className="iw-chart-card"><header><div><h2>{title}</h2><p>Last 30 days · campus time</p></div><span>{Math.round(total * 10) / 10}<small>{metric === "minutes" ? "minutes" : metric}</small></span></header>
    <svg className="iw-activity-chart" viewBox="0 0 600 190" role="img" aria-label={`${title}: ${Math.round(total * 10) / 10} ${metric} over the last 30 days`}>
      {[0, 1, 2, 3].map((tick) => <g key={tick}><line x1="30" x2="595" y1={155 - tick * 45} y2={155 - tick * 45} /><text x="22" y={159 - tick * 45} textAnchor="end">{Math.round(max * tick / 3 * 10) / 10}</text></g>)}
      {days.map((day, index) => <rect key={day.day} x={34 + index * 18.6} y={155 - day[metric] / max * 135} width="11" height={day[metric] / max * 135} rx="3"><title>{`${day.day}: ${day[metric]} ${metric}`}</title></rect>)}
      {[0, 7, 14, 21, 29].map((index) => <text key={index} x={38 + index * 18.6} y="182" textAnchor={index === 29 ? "end" : "start"}>{new Date(days[index].day + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</text>)}
    </svg>
    {!total && <p className="iw-chart-empty">Your first completed activity will appear here.</p>}
    <table className="st-visually-hidden"><caption>{title}</caption><thead><tr><th>Date</th><th>{metric}</th></tr></thead><tbody>{days.map((day) => <tr key={day.day}><td>{day.day}</td><td>{day[metric]}</td></tr>)}</tbody></table>
  </section>;
}
export function InterviewDashboard({ stats, plans }: { stats: InterviewStats; plans: InterviewPlan[] }) {
  const days = interviewActivity(stats);
  const total = stats.statuses.reduce((sum, status) => sum + status.total, 0);
  const completed = stats.statuses.find((item) => item.status === "completed")?.total || 0;
  const active = stats.statuses.find((item) => item.status === "active")?.total || 0;
  const statusSegments = `${completed / (total || 1) * 100}%`;
  const focusMax = Math.max(1, ...stats.focus.map((item) => item.total));
  return <div className="iw-overview">
    <header className="iw-page-heading"><div><p className="iw-eyebrow">YOUR PRACTICE, IN PERSPECTIVE</p><h1>Interview overview</h1><p>A clear view of your conversations, consistency and next steps.</p></div><Link className="st-button" href="/student/interview?view=create"><Plus size={16} />New interview</Link></header>
    <div className="iw-metrics">{[
      { label: "Interview plans", value: stats.plans.plans, note: "Saved and ready to practise", Icon: Layers },
      { label: "Completed sessions", value: stats.sessions.completed, note: `${stats.sessions.total} sessions started`, Icon: Mic },
      { label: "Practice time", value: `${Math.round(stats.sessions.seconds / 60)} min`, note: "From ended sessions", Icon: Clock3 },
      { label: "Answers saved", value: stats.answers, note: `${stats.plans.questions} planned questions`, Icon: MessageSquare },
    ].map(({ label, value, note, Icon }) => <article key={label}><span className="iw-metric-icon"><Icon size={20} strokeWidth={1.5} /></span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>)}</div>
    {!stats.sessions.total && <section className="iw-first-session"><div><span className="iw-eyebrow">START SMALL. BUILD FROM HERE.</span><h2>Your first conversation is ahead.</h2><p>Create a tailored plan, check your devices and practise at your pace.</p></div><Link className="st-button st-button-secondary" href="/student/interview?view=create">Create your first interview<ArrowUpRight size={15} /></Link></section>}
    <div className="iw-chart-grid"><ActivityChart days={days} metric="sessions" title="Daily sessions" /><ActivityChart days={days} metric="minutes" title="Time in practice" /></div>
    <div className="iw-analysis-grid"><ActivityChart days={days} metric="answers" title="Answers put into practice" />
      <section className="iw-chart-card iw-status-card"><header><div><h2>Session status</h2><p>Every attempt has a place in your progress.</p></div></header><div className="iw-status-layout"><div className="iw-donut" style={{ background: total ? `conic-gradient(var(--iw-accent) ${statusSegments}, var(--iw-secondary) ${statusSegments} ${(completed + active) / total * 100}%, var(--iw-line) 0)` : "var(--iw-line)" }} role="img" aria-label={`${total} sessions: ${completed} completed, ${active} active, ${Math.max(0, total - completed - active)} terminated`}><span><strong>{total}</strong><small>sessions</small></span></div><dl>{["completed", "active", "terminated"].map((status, index) => <div key={status}><dt><i data-index={index} />{status}</dt><dd>{stats.statuses.find((s) => s.status === status)?.total || 0}</dd></div>)}</dl></div></section>
    </div>
    <div className="iw-chart-grid">
      <section className="iw-chart-card"><header><div><h2>Question focus</h2><p>Themes in your saved plans, rather than measured skill scores.</p></div></header>{stats.focus.length ? <div className="iw-focus-bars">{stats.focus.map((item) => <div key={item.label}><span>{item.label}<strong>{item.total}</strong></span><progress value={item.total} max={focusMax} aria-label={`${item.label}: ${item.total} planned questions`} /></div>)}</div> : <p className="iw-empty-copy">Save an interview plan to see its focus areas here.</p>}</section>
      <section className="iw-chart-card"><header><div><h2>Recent interviews</h2><p>Pick up a plan or start another attempt.</p></div><Link href="/student/interview?view=library">View all<ArrowUpRight size={14} /></Link></header>{plans.length ? <div className="iw-recent-plans">{plans.slice(0, 4).map((plan) => <Link key={plan.id} href={`/student/interview/${plan.id}`}><span className="iw-small-icon"><Mic size={17} /></span><div><strong>{plan.title}</strong><small>{plan.questions} questions · {plan.sessions} completed sessions</small></div><ArrowUpRight size={15} /></Link>)}</div> : <p className="iw-empty-copy">Your saved interview plans will appear here.</p>}</section>
    </div>
    <section className="iw-chart-card"><header><div><h2>Recent sessions</h2><p>Resume a conversation or explore its complete breakdown.</p></div><Link href="/student/interview?view=sessions">All sessions<ArrowUpRight size={14} /></Link></header>{stats.recent.length ? <div className="iw-session-rows">{stats.recent.slice(0, 5).map((session) => <Link key={session.id} href={`/student/interview/${session.status === "active" ? "session" : "report"}/${session.id}${session.status === "active" ? "" : "?open=1"}`}><div><strong>{session.title}</strong><small><DateLabel value={session.ended_at || session.started_at} /></small></div><span className="iw-status" data-status={session.status}>{session.status}</span><strong className="iw-row-score">{session.report?.scores.overall == null ? "—" : `${session.report.scores.overall}/10`}</strong><ArrowUpRight size={15} /></Link>)}</div> : <p className="iw-empty-copy">Your first session will start this history.</p>}</section>
  </div>;
}
