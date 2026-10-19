"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, MapPin, CalendarDays, X } from "lucide-react";
import { studentFetch } from "../lib/client";
import { PageTitle, Metric, Empty, ErrorNote } from "./UI";
import { applicationStage, deadlineLabel, statusText } from "../lib/progress";
type Filter = "all" | "eligible" | "applied" | "closing";
const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["eligible", "Eligible for me"],
  ["closing", "Closing within 7 days"],
  ["applied", "My applications"],
];
const closingSoon = (drive: Opportunity) => {
  const deadline = deadlineLabel(drive.registration_deadline);
  return deadline.open && deadline.tone !== "neutral";
};
const openForMe = (drive: Opportunity) =>
  !drive.application && drive.eligibility.eligible && deadlineLabel(drive.registration_deadline).open;
export type Opportunity = {
  id: string;
  company: string;
  title: string;
  description: string;
  status: string;
  package_lpa: string | number;
  location: string | null;
  drive_date: string | null;
  registration_deadline: string | null;
  min_cgpa: string;
  max_backlogs: number;
  min_attendance?: string | number | null;
  branches: string[];
  rounds: string[];
  skills: string;
  required_documents: string;
  original_pdf_url: string | null;
  eligibility: { eligible: boolean; gaps: string[]; basis: string };
  application: { status: string; current_round: number } | null;
};
export type OpportunityList = {
  rows: Opportunity[];
  total: number;
  page: number;
  limit: number;
};
export function PlacementBoard({
  initial,
  driveId,
}: {
  initial: OpportunityList;
  driveId?: string;
}) {
  const [data, setData] = useState(initial),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Opportunity | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [filter, setFilter] = useState<Filter>("all");
  const matches = (drive: Opportunity, value: Filter) =>
    value === "eligible"
      ? openForMe(drive)
      : value === "applied"
        ? !!drive.application
        : value === "closing"
          ? closingSoon(drive)
          : true;
  const visible = data.rows.filter((drive) => matches(drive, filter));
  const dialog = useRef<HTMLDialogElement>(null);
  const open = async (id: string) => {
    setError("");
    setConfirmed(false);
    try {
      setSelected(await studentFetch<Opportunity>(`opportunities/${id}`));
      dialog.current?.showModal();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    if (driveId) void open(driveId);
  }, [driveId]);
  const load = async (page = 1) => {
    setBusy(true);
    setError("");
    try {
      setData(
        await studentFetch<OpportunityList>(
          "opportunities?" +
            new URLSearchParams({ search, page: String(page) }),
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const apply = async (withdraw = false) => {
    if (!selected || !confirmed) return;
    setBusy(true);
    setError("");
    try {
      await studentFetch(
        `opportunities/${selected.id}/${withdraw ? "withdraw" : "apply"}`,
        { method: "POST", body: { confirmed: true } },
      );
      await open(selected.id);
      await load(data.page);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        title="An opportunity worth your next step."
        description="Published campus drives, official eligibility and your application progress."
      />
      <div className="st-metrics">
        <Metric label="Published opportunities" value={data.total} />
        <Metric
          label="Open & eligible for you"
          value={data.rows.filter(openForMe).length}
          note={data.total > data.rows.length ? "On this page" : undefined}
        />
        <Metric
          label="Closing within 7 days"
          value={data.rows.filter(closingSoon).length}
        />
        <Metric
          label="Your applications"
          value={data.rows.filter((item) => item.application).length}
          note={data.total > data.rows.length ? "On this page" : undefined}
        />
      </div>
      <form
        className="st-opportunity-search st-actions"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className="st-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
          placeholder="Search companies, roles or job descriptions…"
          aria-label="Search opportunities"
        />
        <button className="st-button" disabled={busy}>
          {busy ? "Searching…" : "Search opportunities"}
        </button>
      </form>
      <div className="st-filter-row" role="group" aria-label="Filter opportunities">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
            <span>{data.rows.filter((drive) => matches(drive, value)).length}</span>
          </button>
        ))}
      </div>
      <ErrorNote message={error} />
      {visible.length ? (
        <div className="st-grid">
          {visible.map((drive) => (
            <article className="st-opportunity" key={drive.id}>
              <div className="st-opportunity-top">
                <span className="st-company-icon">
                  <BriefcaseBusiness size={21} />
                </span>
              </div>
              <p className="st-eyebrow">{drive.company}</p>
              <h2>{drive.title}</h2>
              <strong className="st-package">
                {drive.package_lpa} <small>LPA</small>
              </strong>
              <div className="st-opportunity-facts">
                {drive.location && (
                  <span>
                    <MapPin size={13} />
                    {drive.location}
                  </span>
                )}
                {drive.registration_deadline && (
                  <span>
                    <CalendarDays size={13} />
                    Register by{" "}
                    {String(drive.registration_deadline).slice(0, 10)}
                  </span>
                )}
              </div>
              <div className="st-opportunity-chips">
                <span
                  className={`st-chip st-chip-${deadlineLabel(drive.registration_deadline).tone}`}
                >
                  {deadlineLabel(drive.registration_deadline).text}
                </span>
                {drive.application ? (
                  <span className="st-chip st-chip-good">
                    {applicationStage(drive.application, drive.rounds)?.label}
                  </span>
                ) : drive.eligibility.eligible ? (
                  <span className="st-chip st-chip-good">Eligible</span>
                ) : (
                  <span className="st-chip st-chip-warn">
                    {drive.eligibility.gaps.length
                      ? `${drive.eligibility.gaps.length} requirement${drive.eligibility.gaps.length === 1 ? "" : "s"} not met`
                      : "Not open"}
                  </span>
                )}
              </div>
              <div className="st-opportunity-bottom">
                <span className="st-tag">{statusText(drive.status)}</span>
                <button
                  className="st-button st-button-secondary"
                  onClick={() => void open(drive.id)}
                >
                  View opportunity ↗
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="st-panel">
          <Empty
            title={
              filter !== "all" && data.rows.length
                ? "Nothing here with this filter."
                : search
                  ? "No opportunities match this search."
                  : "Your next opportunity is on its way."
            }
          >
            {filter !== "all" && data.rows.length
              ? "Switch to All to see every published opportunity on this page."
              : search
              ? "Try a company name, role or a broader term."
              : "Published drives for your batch will appear here. Your placement office manages publication."}
          </Empty>
        </div>
      )}
      <div className="st-form-actions">
        <span className="st-muted">
          Page {data.page} · {data.total} opportunities
        </span>
        <div className="st-actions">
          <button
            className="st-button st-button-secondary"
            disabled={data.page <= 1 || busy}
            onClick={() => void load(data.page - 1)}
          >
            ← Previous
          </button>
          <button
            className="st-button st-button-secondary"
            disabled={data.page * data.limit >= data.total || busy}
            onClick={() => void load(data.page + 1)}
          >
            Next →
          </button>
        </div>
      </div>
      <dialog
        className="st-dialog"
        ref={dialog}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
        aria-label="Placement opportunity"
      >
        {selected && (
          <>
            <div className="st-dialog-header">
              <div>
                <p className="st-eyebrow">{selected.company}</p>
                <h2>{selected.title}</h2>
              </div>
              <button
                className="st-icon-button"
                onClick={() => dialog.current?.close()}
                aria-label="Close opportunity"
              >
                <X size={20} />
              </button>
            </div>
            <div className="st-dialog-body">
              <div className="st-metrics">
                <Metric label="Package" value={`${selected.package_lpa} LPA`} />
                <Metric
                  label="Current stage"
                  value={
                    <span style={{ fontSize: 18 }}>
                      {statusText(selected.application?.status || selected.status)}
                    </span>
                  }
                />
              </div>
              {selected.application && (() => {
                const stage = applicationStage(selected.application, selected.rounds);
                return stage ? (
                  <section className="st-stage" aria-label="Application progress">
                    <strong>{stage.label}</strong>
                    <ol>
                      {selected.rounds.map((round, index) => (
                        <li
                          key={index}
                          className={
                            index + 1 < stage.step || (stage.finished && stage.label !== "Withdrawn" && !stage.label.startsWith("Not selected"))
                              ? "is-done"
                              : index + 1 === stage.step && !stage.finished
                                ? "is-current"
                                : ""
                          }
                        >
                          {round}
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null;
              })()}
              <dl className="st-details">
                {[
                  ["Location", selected.location],
                  ["Drive date", selected.drive_date?.slice(0, 10)],
                  [
                    "Registration closes",
                    selected.registration_deadline
                      ? `${selected.registration_deadline.slice(0, 10)} · ${deadlineLabel(selected.registration_deadline).text}`
                      : null,
                  ],
                  ["CGPA requirement", `${selected.min_cgpa}+`],
                  ["Current backlogs allowed", String(selected.max_backlogs)],
                  [
                    "Minimum attendance",
                    selected.min_attendance === null ||
                    selected.min_attendance === undefined
                      ? "No limit"
                      : `${Number(selected.min_attendance)}%`,
                  ],
                  [
                    "Permitted branches",
                    selected.branches.join(", ") || "All branches",
                  ],
                ].map(([title, value]) => (
                  <div key={title}>
                    <dt>{title}</dt>
                    <dd>{value || "Not specified"}</dd>
                  </div>
                ))}
              </dl>
              <h3>About the role</h3>
              <p className="st-preserve st-muted">
                {selected.description ||
                  "No additional description has been published."}
              </p>
              {selected.skills && (
                <>
                  <h3>Required skills</h3>
                  <p className="st-muted">{selected.skills}</p>
                </>
              )}
              <h3>Selection process</h3>
              <ol className="st-bullets">
                {selected.rounds.map((round, index) => (
                  <li key={index}>{round}</li>
                ))}
              </ol>
              {selected.required_documents && (
                <>
                  <h3>Required documents</h3>
                  <p className="st-muted">{selected.required_documents}</p>
                </>
              )}
              {selected.original_pdf_url && (
                <a
                  className="st-button st-button-secondary"
                  href={selected.original_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open original drive PDF ↗
                </a>
              )}
              <section className="st-eligibility">
                <strong>
                  {selected.eligibility.eligible
                    ? "You meet the current registration requirements."
                    : "Please review your eligibility."}
                </strong>
                {selected.eligibility.gaps.length > 0 && (
                  <ul className="st-bullets">
                    {selected.eligibility.gaps.map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                )}
                <p className="st-muted">{selected.eligibility.basis}</p>
              </section>
              <div className="st-form">
                <label>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  {selected.application
                    ? "I confirm that I want to withdraw this active application."
                    : "I have reviewed the role and requirements, and confirm my interest."}
                </label>
                <ErrorNote message={error} />
                <div className="st-actions">
                  {!selected.application && (
                    <button
                      className="st-button"
                      disabled={
                        !selected.eligibility.eligible || !confirmed || busy
                      }
                      onClick={() => void apply()}
                    >
                      Register for this drive ↗
                    </button>
                  )}
                  {selected.application &&
                    ["registered", "in-progress", "selected"].includes(
                      selected.application.status,
                    ) && (
                      <button
                        className="st-button st-button-secondary"
                        disabled={!confirmed || busy}
                        onClick={() => void apply(true)}
                      >
                        Withdraw application
                      </button>
                    )}
                  <Link
                    className="st-button st-button-secondary"
                    href={`/student/observation-haki?drive=${selected.id}`}
                  >
                    Compare my profile with this JD ↗
                  </Link>
                </div>
                <small className="st-muted">
                  AI comparison is advisory and does not change official
                  eligibility.
                </small>
              </div>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
