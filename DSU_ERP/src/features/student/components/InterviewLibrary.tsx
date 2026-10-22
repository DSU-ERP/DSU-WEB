"use client";
import { useState } from "react";
import Link from "next/link";
import { Mic, LayoutGrid, List, Archive, Download } from "lucide-react";
import { studentFetch } from "../lib/client";
import type { InterviewPlan } from "../lib/interview-types";
import { PageTitle, Panel, Empty, DateLabel, ErrorNote } from "./UI";
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
