import Link from "next/link";
import { DateLabel, Progress } from "./UI";
import { ArrowRight, ArrowUpRight, Mic, Sparkles, MessageSquare, CalendarDays, Check, FileText } from "lucide-react";
import type { Notice, OfficialStudent } from "../lib/types";
import { academicStanding, activitySeries, deadlineLabel, readinessChecklist, statusText, type ActivityDay } from "../lib/progress";
export type DashboardData = {
  official: OfficialStudent;
  profile: { fullName?: string };
  onboarded: boolean;
  score: number | null;
  band: string;
  basis: string;
  skills: {
    overall: number | null;
    communication: number | null;
    accuracy: number | null;
    confidence: number | null;
  };
  sessions: number;
  plans: number;
  assessments: number;
  resume: { id: string; created_at: string } | null;
  latestSession: {
    id: string;
    report: { strengths: string[]; improvements: string[]; nextPlan: string[] };
    ended_at: string;
  } | null;
  streak: { current: number; best: number };
  activityDates: string[];
  // Preparation activity per campus day; older backends omit it.
  activity?: ActivityDay[];
  pipeline?: {
    registered: number;
    inProgress: number;
    selected: number;
    placed: number;
    rejected: number;
    total: number;
  };
  schedule: {
    id: string;
    title: string;
    kind: string;
    starts_at: string;
    location: string | null;
  }[];
  deadlines: {
    id: string;
    title: string;
    company: string;
    registration_deadline: string;
  }[];
  applications: {
    id: string;
    company: string;
    title: string;
    status: string;
    drive_id: string;
  }[];
  notifications: Notice[];
  next: { title: string; reason: string; href: string; label: string };
  academicEligibility: boolean | null;
};
export function ReadinessRing({ data }: { data: DashboardData }) {
  return (
    <div
      className="st-ring"
      style={{ "--score": `${data.score ?? 0}%` } as React.CSSProperties}
    >
      <div>
        <strong>{data.score ?? "—"}</strong>
        <small>{data.band}</small>
      </div>
    </div>
  );
}
function ActivityStrip({ activity }: { activity: ActivityDay[] }) {
  const days = activitySeries(activity);
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const peak = Math.max(1, ...days.map((day) => day.count));
  const label = (day: string) =>
    new Date(day + "T00:00:00Z").toLocaleDateString("en-IN", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
    });
  return (
    <div className="st-spark-wrap">
      <div className="st-spark-head">
        <span>Last 14 days</span>
        <small>
          {total
            ? `${total} completed ${total === 1 ? "activity" : "activities"}`
            : "No completed activity yet"}
        </small>
      </div>
      <ol
        className="st-spark"
        aria-label={`Completed interviews, assessments and resume reports per day over the last 14 days: ${total} in total`}
      >
        {days.map((day) => (
          <li
            key={day.day}
            title={`${label(day.day)}: ${day.count}`}
            className={day.count ? "is-active" : ""}
          >
            <span
              style={{ height: `${day.count ? Math.max(18, (day.count / peak) * 100) : 6}%` }}
            />
            <small className="st-visually-hidden">
              {label(day.day)}: {day.count}
            </small>
          </li>
        ))}
      </ol>
      <div className="st-spark-axis" aria-hidden="true">
        <small>{label(days[0].day)}</small>
        <small>Today</small>
      </div>
    </div>
  );
}
export function Dashboard({ data }: { data: DashboardData }) {
  const words = (data.profile.fullName || data.official.full_name).trim().split(/\s+/);
  const first = words.find((word) => word.replace(/\./g, "").length > 1) || words[0] || "there";
  const name = first === first.toUpperCase() ? first[0] + first.slice(1).toLowerCase() : first;
  const now = new Date();
  const hour = Number(now.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const standing = academicStanding(data.official.cgpa);
  const checklist = readinessChecklist({ onboarded: data.onboarded, resume: !!data.resume, sessions: data.sessions, assessments: data.assessments, applications: data.pipeline?.total ?? data.applications.length });
  const pipeline = data.pipeline ? [
    ["Registered", data.pipeline.registered], ["In progress", data.pipeline.inProgress],
    ["Selected", data.pipeline.selected], ["Placed", data.pipeline.placed], ["Rejected", data.pipeline.rejected],
  ] : ["registered", "in-progress", "selected", "placed", "rejected"].map((status) => [statusText(status), data.applications.filter((item) => item.status === status).length]);
  return (
    <div className="st-home">
      <header className="st-home-welcome">
        <p className="st-home-date">{now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", month: "long", day: "numeric" })}</p>
        <h1>{greeting}, {name}.</h1>
        <p>A little focus. A little practice. A step closer.</p>
      </header>

      <nav className="st-home-launcher" aria-label="Start preparing">
        {[
          { title: "Practise an interview", note: "Build confidence in your answers", href: "/student/interview?view=create", Icon: Mic },
          { title: "Take a mock test", note: "Give your knowledge a workout", href: "/student/ai-mock-test", Icon: Sparkles },
          { title: "Ask Observation Haki", note: "Think through your next move", href: "/student/observation-haki", Icon: MessageSquare },
        ].map(({ title, note, href, Icon }) => (
          <Link key={href} href={href}>
            <span className="st-home-launch-icon"><Icon size={20} strokeWidth={1.6} /></span>
            <strong>{title}</strong><span>{note}</span><ArrowUpRight className="st-home-launch-arrow" size={16} />
          </Link>
        ))}
      </nav>

      <section className="st-home-next" aria-labelledby="home-next-title">
        <span className="st-home-next-icon"><FileText size={22} strokeWidth={1.5} /></span>
        <div><p className="st-home-kicker">A good next step</p><h2 id="home-next-title">{data.next.title}</h2><p>{data.next.reason}</p></div>
        <Link className="st-home-primary" href={data.next.href}>{data.next.label}<ArrowRight size={16} /></Link>
      </section>

      <dl className="st-home-stats" aria-label="Your progress at a glance">
        {[
          { label: "Interviews completed", value: data.sessions, note: data.plans + " saved plans" },
          { label: "Assessments completed", value: data.assessments, note: "Completed attempts" },
          { label: "Day preparation streak", value: data.streak.current, note: `Best streak: ${data.streak.best} ${data.streak.best === 1 ? "day" : "days"}` },
          { label: "Official CGPA", value: standing.value, note: standing.note },
        ].map((item) => <div key={item.label} title={item.note}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
      </dl>

      <div className="st-home-columns">
        <div className="st-home-main">
          <section className="st-home-section" aria-labelledby="home-preparation-title">
            <header><h2 id="home-preparation-title">Your preparation</h2><Link href="/student/readiness">View details<ArrowUpRight size={14} /></Link></header>
            <div className="st-home-readiness">
              <ReadinessRing data={data} />
              <div>{data.sessions ? Object.entries(data.skills).filter(([key]) => key !== "overall").map(([key, value]) => <Progress key={key} label={key === "accuracy" ? "Technical & business" : key[0].toUpperCase() + key.slice(1)} value={value} />) : <><h3>Your baseline starts here.</h3><p>Complete an interview to see your strengths and what to work on next.</p><Link className="st-home-text-link" href="/student/interview?view=create">Create your first interview<ArrowRight size={14} /></Link></>}</div>
            </div>
            {data.activity && <ActivityStrip activity={data.activity} />}
            <p className="st-home-fineprint">{data.basis}</p>
            {checklist.done < checklist.steps.length && <details className="st-home-checklist" open={!data.onboarded}>
              <summary><span>Make the most of your workspace</span><small>{checklist.done} of {checklist.steps.length} complete</small></summary>
              <ol>{checklist.steps.map((step) => <li key={step.key} data-done={step.done}>
                <span className="st-home-step-mark" aria-hidden="true">{step.done && <Check size={12} />}</span>
                {step.done ? <span>{step.title}<small>Completed</small></span> : <Link href={step.href}>{step.title}<small>{step.hint}</small></Link>}
                {!step.done && <ArrowUpRight size={14} aria-hidden="true" />}
              </li>)}</ol>
            </details>}
          </section>

          <section className="st-home-section st-home-applications" aria-labelledby="home-applications-title">
            <header><h2 id="home-applications-title">Placement journey</h2><Link href="/student/placement">Explore drives<ArrowUpRight size={14} /></Link></header>
            <dl className="st-home-pipeline">{pipeline.map(([label, count]) => <div key={String(label)}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
            {data.applications.length ? <div className="st-home-rows">{data.applications.slice(0, 5).map((item) => <Link key={item.id} href={`/student/placement?drive=${item.drive_id}`}><div><strong>{item.company}</strong><span>{item.title}</span></div><small className="st-tag">{statusText(item.status)}</small></Link>)}</div> : <p className="st-home-quiet">Your applications will appear here when you register for a placement drive.</p>}
          </section>
        </div>

        <aside className="st-home-aside" aria-label="Upcoming events and campus updates">
          <section className="st-home-section" aria-labelledby="home-upcoming-title">
            <header><h2 id="home-upcoming-title">Coming up</h2><Link href="/student/timetable" aria-label="View timetable"><CalendarDays size={17} strokeWidth={1.5} /></Link></header>
            {data.schedule.length > 0 && <div className="st-home-rows">{data.schedule.slice(0, 4).map((event) => <article key={event.id}><span className="st-home-kicker">{event.kind}</span><h3>{event.title}</h3><div className="st-home-event-time"><DateLabel value={event.starts_at} /></div>{event.location && <p>{event.location}</p>}</article>)}</div>}
            {data.deadlines.length > 0 && <div className="st-home-deadlines"><h3>Drive deadlines</h3>{data.deadlines.slice(0, 4).map((drive) => <Link key={drive.id} href={`/student/placement?drive=${drive.id}`}><div><strong>{drive.company}</strong><span>{drive.title}</span></div><span className={`st-chip st-chip-${deadlineLabel(drive.registration_deadline).tone}`}>{deadlineLabel(drive.registration_deadline).text}</span></Link>)}</div>}
            {!data.schedule.length && !data.deadlines.length && <div className="st-home-empty"><CalendarDays size={24} strokeWidth={1.3} /><h3>A little room to focus.</h3><p>No upcoming events or drive deadlines to show. Make some time for your next practice session.</p></div>}
            <Link className="st-home-text-link" href="/student/timetable">Plan your week<ArrowRight size={14} /></Link>
            {(data.schedule.length > 4 || data.deadlines.length > 4) && <Link className="st-home-text-link" href="/student/placement">All placement opportunities<ArrowUpRight size={14} /></Link>}
          </section>

          <section className="st-home-section st-home-resume" aria-labelledby="home-resume-title">
            <header><h2 id="home-resume-title">Your career toolkit</h2><FileText size={17} strokeWidth={1.5} /></header>
            <p>{data.resume ? "Your resume report is ready. Revisit your role fit and recommended improvements." : "Bring your experience into focus with a resume and role-fit report."}</p>
            <Link className="st-home-text-link" href="/student/resume">{data.resume ? "View career report" : "Explore career report"}<ArrowRight size={14} /></Link>
          </section>

          {data.notifications.length > 0 && <section className="st-home-section" aria-labelledby="home-updates-title"><header><h2 id="home-updates-title">Campus updates</h2></header><div className="st-home-rows">{data.notifications.map((notice) => <article key={notice.id}>{notice.href ? <Link href={notice.href}><h3>{notice.title}</h3></Link> : <h3>{notice.title}</h3>}<p>{notice.body}</p>{!notice.read_at && <span className="st-home-unread">Unread</span>}</article>)}</div></section>}
        </aside>
      </div>
    </div>
  );
}
