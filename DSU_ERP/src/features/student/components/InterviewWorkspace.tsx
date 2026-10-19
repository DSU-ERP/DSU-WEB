"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  Plus,
  LayoutGrid,
  List,
  Archive,
  Download,
  Sparkles,
} from "lucide-react";
import { studentFetch } from "../lib/client";
import type {
  InterviewPlan,
  InterviewStats,
  InterviewConfig,
} from "../lib/interview-types";
import { PageTitle, Panel, Metric, Empty, DateLabel, ErrorNote } from "./UI";
import { DocumentUpload } from "./DocumentUpload";
export function InterviewNavigation({ view }: { view: string }) {
  return (
    <div className="st-interview-nav">
      <div className="st-tabs">
        <Link
          aria-current={view === "dashboard" ? "page" : undefined}
          href="/student/interview"
        >
          Activity
        </Link>
        <Link
          aria-current={view === "library" ? "page" : undefined}
          href="/student/interview?view=library"
        >
          Interview library
        </Link>
        <Link
          aria-current={view === "create" ? "page" : undefined}
          href="/student/interview?view=create"
        >
          Create interview
        </Link>
      </div>
      <Link className="st-muted" href="/student/dashboard">
        ← Student dashboard
      </Link>
    </div>
  );
}
export function InterviewDashboard({
  stats,
  plans,
}: {
  stats: InterviewStats;
  plans: InterviewPlan[];
}) {
  return (
    <>
      <PageTitle
        eyebrow="DSU / AI INTERVIEW WORKSPACE"
        title="Practice with purpose."
        description="A place to prepare, reflect and find your next improvement."
        action={
          <Link className="st-button" href="/student/interview?view=create">
            <Plus size={14} />
            New interview
          </Link>
        }
      />
      <InterviewNavigation view="dashboard" />
      <div className="st-metrics">
        <Metric label="Saved interview plans" value={stats.plans.plans} />
        <Metric
          label="Completed sessions"
          value={stats.sessions.completed}
          note={`${stats.sessions.total} sessions started`}
        />
        <Metric
          label="Recorded practice time"
          value={`${Math.round(stats.sessions.seconds / 60)} min`}
        />
        <Metric
          label="Planned questions"
          value={stats.plans.questions}
          note="Planned questions are not answered questions"
        />
      </div>
      {stats.sessions.total ? (
        <div className="st-two-col">
          <Panel
            title="Your practice rhythm"
            subtitle="Sessions started each day, over the last 30 days."
          >
            <div className="st-chart">
              {stats.daily.map((day) => (
                <div key={day.activity_date}>
                  <i
                    style={{
                      height: `${Math.max(5, (day.sessions / Math.max(...stats.daily.map((item) => item.sessions))) * 85)}%`,
                    }}
                    title={`${day.activity_date}: ${day.sessions} sessions`}
                  />
                  <small>{day.activity_date.slice(5)}</small>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Time spent in practice"
            subtitle="Recorded duration from ended sessions."
          >
            <div className="st-chart">
              {stats.daily.map((day) => (
                <div key={day.activity_date}>
                  <i
                    style={{
                      height: `${Math.max(5, (day.seconds / Math.max(1, ...stats.daily.map((item) => item.seconds))) * 85)}%`,
                    }}
                    title={`${Math.round(day.seconds / 60)} minutes`}
                  />
                  <small>{day.activity_date.slice(5)}</small>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : (
        <Panel>
          <Empty
            title="Your first conversation starts the story."
            href="/student/interview?view=create"
            label="Create your first interview"
          >
            Build a plan around your role and experience. Creating a plan does
            not count as completing an interview.
          </Empty>
        </Panel>
      )}
      <div className="st-metrics">
        <Metric label="Saved answers" value={stats.answers} />
        <Metric
          label="Question / answer exchanges"
          value={stats.answers}
          note="One exchange per saved answer"
        />
        {stats.statuses.map((s) => (
          <Metric
            key={s.status}
            label={s.status + " sessions"}
            value={s.total}
          />
        ))}
      </div>
      <div className="st-two-col">
        <Panel
          title="Questions practised by day"
          subtitle="Saved answers over the last 30 days."
        >
          <div className="st-chart">
            {stats.answerDays.map((day) => (
              <div key={day.activity_date}>
                <i
                  style={{
                    height:
                      String(
                        Math.max(
                          5,
                          (day.answers /
                            Math.max(
                              1,
                              ...stats.answerDays.map((d) => d.answers),
                            )) *
                            85,
                        ),
                      ) + "%",
                  }}
                  title={day.answers + " answers"}
                />
                <small>{day.activity_date.slice(5)}</small>
              </div>
            ))}
          </div>
          {!stats.answerDays.length && (
            <p className="st-muted">
              Your first saved answer will start this chart.
            </p>
          )}
        </Panel>
        <Panel
          title="Focus in your interview plans"
          subtitle="Planned question themes, not measured skill scores."
        >
          {stats.focus.map((item) => (
            <div className="st-list-row" key={item.label}>
              <p>{item.label}</p>
              <strong>{item.total} questions</strong>
            </div>
          ))}
          {!stats.focus.length && (
            <p className="st-muted">Save a plan to see its focus areas here.</p>
          )}
        </Panel>
      </div>
      <div className="st-two-col">
        <Panel title="Recent sessions">
          {stats.recent.length ? (
            stats.recent.map((session) => (
              <Link
                key={session.id}
                className="st-list-row"
                href={`/student/interview/session/${session.id}`}
              >
                <div>
                  <p>{session.title}</p>
                  <small>
                    <DateLabel value={session.ended_at || session.started_at} />
                  </small>
                </div>
                <div>
                  <span className="st-tag">{session.status}</span>
                  <p>
                    {session.report?.scores.overall === null || !session.report
                      ? "Not scored"
                      : `${session.report.scores.overall}/10`}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <p className="st-muted">
              Completed and active sessions will appear here.
            </p>
          )}
        </Panel>
        <Panel title="Recent interview plans">
          {plans.length ? (
            plans.slice(0, 6).map((plan) => (
              <Link
                className="st-list-row"
                key={plan.id}
                href={`/student/interview/${plan.id}`}
              >
                <div>
                  <p>{plan.title}</p>
                  <small>
                    {plan.questions} planned questions · {plan.sessions}{" "}
                    completed sessions
                  </small>
                </div>
                <span>↗</span>
              </Link>
            ))
          ) : (
            <p className="st-muted">Your saved plans will appear here.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
export function InterviewLibrary({ initial }: { initial: InterviewPlan[] }) {
  const [plans, setPlans] = useState(initial),
    [search, setSearch] = useState(""),
    [days, setDays] = useState("all"),
    [archived, setArchived] = useState(false),
    [view, setView] = useState("grid"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const query = new URLSearchParams({ search, archived: String(archived) });
      if (days !== "all")
        query.set(
          "from",
          new Date(Date.now() - Number(days) * 86400000).toISOString(),
        );
      setPlans(await studentFetch<InterviewPlan[]>("interviews?" + query));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const archive = async (plan: InterviewPlan) => {
    if (
      !window.confirm(
        `${plan.archived ? "Restore" : "Archive"} this plan? Saved sessions remain attached to it.`,
      )
    )
      return;
    try {
      await studentFetch(`interviews/${plan.id}/archive`, {
        method: "POST",
        body: { archived: !plan.archived },
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const exportPlans = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(plans, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "dsu-interview-library.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageTitle
        title="Your interview library."
        description="Find a plan, revisit a session and build on what you learned."
        action={
          <Link className="st-button" href="/student/interview?view=create">
            New interview +
          </Link>
        }
      />
      <InterviewNavigation view="library" />
      <form
        className="st-library-filters st-form"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label>
          Search plans
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titles, goals or company context"
            maxLength={100}
          />
        </label>
        <label>
          Date range
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={String(archived)}
            onChange={(e) => setArchived(e.target.value === "true")}
          >
            <option value="false">Active plans</option>
            <option value="true">Archived plans</option>
          </select>
        </label>
        <button className="st-button" disabled={busy}>
          {busy ? "Loading…" : "Apply"}
        </button>
        <button
          className="st-button st-button-secondary"
          type="button"
          onClick={exportPlans}
        >
          <Download size={14} />
          Export
        </button>
        <button
          className="st-icon-button"
          type="button"
          aria-label={view === "grid" ? "Use list view" : "Use grid view"}
          onClick={() => setView(view === "grid" ? "list" : "grid")}
        >
          {view === "grid" ? <List size={18} /> : <LayoutGrid size={18} />}
        </button>
      </form>
      <ErrorNote message={error} />
      {plans.length ? (
        <div className={view === "grid" ? "st-grid" : "st-interview-list"}>
          {plans.map((plan) => (
            <article className="st-interview-card" key={plan.id}>
              <Link href={`/student/interview/${plan.id}`}>
                <span className="st-company-icon">
                  <Mic size={21} />
                </span>
                <h2>{plan.title}</h2>
                <p className="st-muted">{plan.goal}</p>
                <div className="st-actions">
                  <span className="st-tag">{plan.questions} questions</span>
                  <span className="st-tag">
                    {plan.sessions} completed sessions
                  </span>
                </div>
                <small>
                  {Math.round(plan.seconds / 60)} practice minutes ·{" "}
                  <DateLabel value={plan.created_at} />
                </small>
              </Link>
              <button
                className="st-icon-button"
                aria-label={`${plan.archived ? "Restore" : "Archive"} ${plan.title}`}
                onClick={() => void archive(plan)}
              >
                <Archive size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Panel>
          <Empty
            title={
              search
                ? "No plans match this search."
                : "Room for your next conversation."
            }
            href="/student/interview?view=create"
            label="Create an interview"
          >
            Build your first plan or choose a broader date range.
          </Empty>
        </Panel>
      )}
      <p className="st-muted" style={{ marginTop: 20 }}>
        Showing the latest 100 matching plans.
      </p>
    </>
  );
}
export function InterviewCreator() {
  const router = useRouter();
  const [source, setSource] = useState("ai"),
    [goal, setGoal] = useState(""),
    [jd, setJd] = useState(""),
    [resume, setResume] = useState(""),
    [manual, setManual] = useState(""),
    [config, setConfig] = useState<InterviewConfig>({
      durationMinutes: 20,
      language: "en-IN",
      tone: "friendly",
      depth: "moderate",
      questionCount: 6,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ready, setReady] = useState<{ id: string; title: string } | null>(null);
  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      setReady(
        await studentFetch("interviews", {
          method: "POST",
          body: {
            source,
            goal,
            jd,
            resume,
            config,
            manualQuestions:
              source === "manual"
                ? manual
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean)
                : [],
          },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        title="Build a conversation around your ambition."
        description="Bring a goal, a role and the evidence in your resume. Make every question relevant."
      />
      <InterviewNavigation view="create" />
      <div className="st-two-col">
        <Panel title="Create your interview">
          <div className="st-tabs">
            <button
              aria-selected={source === "ai"}
              onClick={() => setSource("ai")}
            >
              <Sparkles size={13} /> AI generator
            </button>
            <button
              aria-selected={source === "manual"}
              onClick={() => setSource("manual")}
            >
              Manual questions
            </button>
          </div>
          <div className="st-form">
            <label>
              Your interview goal
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                maxLength={3000}
                placeholder="e.g. Help me prepare for a graduate analyst role, using examples from my internship and projects."
              />
            </label>
            {source === "manual" ? (
              <label>
                Questions · one per line, between 3 and 15
                <textarea
                  rows={10}
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder={
                    "Tell me about yourself.\nDescribe a problem you solved.\nWhy are you interested in this role?"
                  }
                />
              </label>
            ) : (
              <>
                <DocumentUpload
                  kind="jd"
                  label="Upload the company JD"
                  onReady={(document) => setJd(document.content)}
                />
                <label>
                  Company JD and role context
                  <textarea
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    rows={7}
                    maxLength={20000}
                  />
                </label>
                <DocumentUpload
                  kind="resume"
                  label="Upload your resume"
                  onReady={(document) => setResume(document.content)}
                />
                <label>
                  Your resume evidence
                  <textarea
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                    rows={7}
                    maxLength={60000}
                  />
                </label>
              </>
            )}
            <ErrorNote message={error} />
            <button
              className="st-button"
              disabled={busy || goal.trim().length < 10}
              onClick={() => void generate()}
            >
              {busy
                ? "Preparing a tailored conversation…"
                : source === "manual"
                  ? "Save interview plan ↗"
                  : "Generate interview ↗"}
            </button>
          </div>
        </Panel>
        <div>
          <Panel title="Shape the experience">
            <div className="st-form">
              <label>
                Duration in minutes
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={config.durationMinutes}
                  onChange={(e) =>
                    setConfig((current) => ({
                      ...current,
                      durationMinutes: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Language
                <select
                  value={config.language}
                  onChange={(e) =>
                    setConfig((current) => ({
                      ...current,
                      language: e.target.value,
                    }))
                  }
                >
                  <option value="en-IN">English (India)</option>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                </select>
              </label>
              <label>
                Interviewer tone
                <select
                  value={config.tone}
                  onChange={(e) =>
                    setConfig((current) => ({
                      ...current,
                      tone: e.target.value,
                    }))
                  }
                >
                  <option value="friendly">Friendly and constructive</option>
                  <option value="confident">Confident and direct</option>
                  <option value="strict">Strict and focused</option>
                </select>
              </label>
              <label>
                Follow-up depth
                <select
                  value={config.depth}
                  onChange={(e) =>
                    setConfig((current) => ({
                      ...current,
                      depth: e.target.value,
                    }))
                  }
                >
                  <option value="moderate">Moderate</option>
                  <option value="deep">
                    Deep · up to two tailored follow-ups
                  </option>
                </select>
              </label>
              {source === "ai" && (
                <label>
                  Planned questions
                  <input
                    type="number"
                    min={3}
                    max={15}
                    value={config.questionCount}
                    onChange={(e) =>
                      setConfig((current) => ({
                        ...current,
                        questionCount: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              )}
              <p className="st-muted">
                Your chosen duration is enforced by the server. Voice language
                and tone are carried into the session. Deep follow-ups use your
                actual answers.
              </p>
            </div>
          </Panel>
          <Panel title="Choose your mode after creation">
            <p className="st-muted">
              <strong>Mock:</strong> visible questions, typed or spoken answers
              and immediate coaching.
            </p>
            <p className="st-muted" style={{ marginTop: 12 }}>
              <strong>Proctored AI:</strong> camera, microphone, entire-screen
              sharing and fullscreen, with results held until completion. This
              is an AI session, not a human recruiter call.
            </p>
          </Panel>
          {ready && (
            <Panel>
              <div className="st-ready-panel">
                <h3>{ready.title}</h3>
                <p>
                  Your plan is ready. Review it, choose a mode and begin when
                  you’re comfortable.
                </p>
                <button
                  className="st-button"
                  onClick={() => router.push(`/student/interview/${ready.id}`)}
                >
                  Open interview ↗
                </button>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
