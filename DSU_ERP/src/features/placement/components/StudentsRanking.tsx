// Students Ranking (Placement Officer). Server-rendered: tabs are links,
// filters and comparison are plain GET forms, so every view is a shareable URL
// and the backend does all filtering, ranking and pagination.
import Link from "next/link";
import { BadgeCheck, CircleHelp, GitCompareArrows, Info } from "lucide-react";
import {
  EVIDENCE_LABELS,
  FAMILY_LABELS,
  KINDS,
  PART_LABELS,
  RULES,
  STATUS_LABELS,
  departmentLabel,
  formatScore,
  formatWhen,
  rankingHref,
  unrankedReason,
  type ComponentResult,
  type ComponentStatus,
  type Position,
  type RankingKind,
  type RankingList,
  type RankingOverview,
  type RankingQuery,
  type RankingRow,
  type RankingStudent,
  type TopProject,
} from "@/features/placement/lib/ranking";

const count = (n: number | undefined) => (n ?? 0).toLocaleString("en-IN");

export function RankingHeader({ overview }: { overview: RankingOverview | null }) {
  const m = overview?.model;
  return (
    <>
      <p className="erp-eyebrow">DSU / PLACEMENT OFFICER</p>
      <div className="po-heading">
        <div>
          <h1>Students Ranking</h1>
          <p className="erp-muted">Academic performance, coding evidence, and project engineering insights across DSU students.</p>
        </div>
      </div>
      <p className="po-note po-rank-provisional" role="note">
        <Info size={14} aria-hidden="true" />
        <span>
          <strong>Developer scores are provisional.</strong> They combine CGPA, LeetCode and GitHub evidence
          {m ? ` (model ${m.version}, weights ${pct(m.weights.academic)} / ${pct(m.weights.dsa)} / ${pct(m.weights.github)})` : ""}. They describe
          software-oriented evidence, not overall engineering ability, and must never be used to reject a student automatically.
        </span>
      </p>
    </>
  );
}
const pct = (w: number) => `${Math.round(w * 100)}%`;

export function RankingSummary({ overview }: { overview: RankingOverview }) {
  const c = overview.counts;
  const items: [string, number, string][] = [
    ["Students", c.students, "In the selected batch, department and semester"],
    ["Valid CGPA", c.validCgpa, "Official CGPA recorded in the ERP"],
    ["GitHub connected", c.githubLinked, "Linked GitHub accounts"],
    ["LeetCode connected", c.leetcodeLinked, "Linked LeetCode profiles"],
    ["Developer ranking eligible", c.developerEligible, "All three components current"],
    ["Awaiting evidence", c.awaitingEvidence, "Linked, but platform data not collected yet"],
  ];
  return (
    <>
      <div className="po-metrics po-rank-metrics" role="list" aria-label="Ranking coverage">
        {items.map(([label, value, hint]) => (
          <article key={label} role="listitem" title={hint}>
            <span>{label}</span>
            <strong>{count(value)}</strong>
          </article>
        ))}
      </div>
      <p className="po-note">
        Scores last calculated {formatWhen(c.lastCalculatedAt)}.
        {c.notCalculated ? ` ${count(c.notCalculated)} students have not been calculated yet; they appear after the next background pass.` : ""}
      </p>
    </>
  );
}

export function RankingTabs({ query }: { query: RankingQuery }) {
  const current = query.kind ?? "academic";
  return (
    <nav className="po-rank-tabs" aria-label="Ranking type">
      {KINDS.map(({ kind, label }) => (
        <Link
          key={kind}
          href={rankingHref({ kind, batch: query.batch, department: query.department, semester: query.semester, show: query.show })}
          aria-current={kind === current ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function RankingFilters({ overview, query }: { overview: RankingOverview; query: RankingQuery }) {
  const kind = query.kind ?? "academic";
  const select = (name: keyof RankingQuery, title: string, options: [string, string][], all: string) => (
    <label>
      {title}
      <select name={name} defaultValue={query[name] ?? ""}>
        <option value="">{all}</option>
        {options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </label>
  );
  const rankable = overview.topics.filter((t) => t.source);
  return (
    <form key={JSON.stringify(query)} action="/placement/students-ranking" className="po-filters" role="search" aria-label="Ranking filters">
      <input type="hidden" name="kind" value={kind} />
      {kind === "topic" && (
        <label>
          Topic
          <select name="topic" defaultValue={query.topic ?? rankable[0]?.code} required>
            {(["dsa", "software", "specialization"] as const).map((family) => (
              <optgroup key={family} label={FAMILY_LABELS[family]}>
                {rankable.filter((t) => t.family === family).map((t) => (
                  <option key={t.code} value={t.code}>{t.label} ({count(t.students)})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}
      <label>
        Search
        <input name="search" type="search" defaultValue={query.search ?? ""} placeholder="Name or USN" maxLength={100} autoComplete="off" />
      </label>
      {select("batch", "Batch", overview.options.batches.map((b) => [b, b]), "All batches")}
      {select("department", "Department", overview.options.departments.map((d) => [d.code, departmentLabel(d.code, d.name)]), "All departments")}
      {select("semester", "Semester", overview.options.semesters.map((s) => [s, s]), "All semesters")}
      {select("evidence", "Evidence", [["complete", "Complete"], ["partial", "Partial"], ["pending", "Pending"]], "Any evidence")}
      {select("updated", "Evidence updated", [["7", "Within 7 days"], ["30", "Within 30 days"], ["older", "Older or never"]], "Any time")}
      {select("show", "Students shown", [["all", "Include not ranked"]], "Ranked only")}
      <button className="erp-primary">Apply filters</button>
      <Link className="erp-secondary" href={rankingHref({ kind, topic: query.topic })}>Reset filters</Link>
    </form>
  );
}

function Status({ status, label }: { status: ComponentStatus; label?: string }) {
  return <span className={`po-status po-rank-status-${status}`}>{label ?? STATUS_LABELS[status] ?? status}</span>;
}
// A pending developer score is waiting on its components, not on a sync.
function ScoreCell({ score, status, developer }: { score: number | null; status: ComponentStatus; developer?: boolean }) {
  return score === null ? <Status status={status} label={developer && status === "pending" ? "Pending score" : undefined} /> : (
    <span>
      {formatScore(score)}
      {status === "stale" && <span className="po-status po-rank-status-stale po-rank-inline">Stale</span>}
    </span>
  );
}

/** LeetCode name check (username or profile name against the official name). Not proof of ownership. */
export function NameMatch({ value }: { value: string | null | undefined }) {
  if (value !== "verified" && value !== "unverified") return null;
  return value === "verified" ? (
    <span className="po-rank-namematch po-rank-namematch-verified" title="LeetCode username or profile name matches the student's official name">
      <BadgeCheck size={12} aria-hidden="true" /> Verified
    </span>
  ) : (
    <span className="po-rank-namematch po-rank-namematch-unverified" title="LeetCode username and profile name do not match the student's official name">
      <CircleHelp size={12} aria-hidden="true" /> Unverified
    </span>
  );
}

function topicSummary(row: RankingRow) {
  const ev = row.topic?.evidence;
  if (!ev) return "No verified evidence";
  if (ev.solved !== undefined) return `${count(ev.solved)} problems solved`;
  const best = ev.repositories?.[0];
  return best ? `${best.name}${ev.repositories!.length > 1 ? ` and ${ev.repositories!.length - 1} more` : ""}` : "No verified evidence";
}

export function RankingTable({ data, query, topicLabel }: { data: RankingList; query: RankingQuery; topicLabel?: string }) {
  const kind: RankingKind = data.scope.kind;
  const { total, page, limit } = data.pagination;
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(total, page * limit);
  const scopeText = [data.scope.batch ? `batch ${data.scope.batch}` : "all batches", data.scope.department ? departmentLabel(data.scope.department) : "all departments", data.scope.semester ? `semester ${data.scope.semester}` : null]
    .filter(Boolean).join(", ");
  const valueHeader = kind === "topic" ? `${topicLabel ?? "Topic"} evidence` : KINDS.find((k) => k.kind === kind)!.value;
  return (
    <section className="erp-panel po-directory" aria-labelledby="po-ranking-heading">
      <h2 id="po-ranking-heading">{KINDS.find((k) => k.kind === kind)!.label}{kind === "topic" && topicLabel ? `: ${topicLabel}` : ""}</h2>
      <p className="po-note" id="po-ranking-rule">
        <strong>How ranks work.</strong> {RULES[kind]} Ranks are computed across {scopeText}; search, evidence and freshness filters only hide rows, so a student keeps
        the same rank on every page. Equal scores share a rank and are listed by USN. {count(data.scope.ranked)} students are ranked in this view.
      </p>
      {!data.rows.length ? (
        <p className="erp-empty">
          {page > 1 ? "This page is past the last result. Go back to the first page."
            : kind === "academic" ? "No students match these filters."
            : query.show === "all" ? "No students match these filters."
            : "No student has enough verified evidence for this ranking yet. Choose \"Include not ranked\" to see who is waiting and why."}
        </p>
      ) : (
        <form action="/placement/students-ranking/compare" className="po-rank-compare-form">
          <div className="erp-table-scroll" tabIndex={0} role="region" aria-label="Ranked students">
            <table className="erp-table po-table po-rank-table">
              <caption className="erp-visually-hidden">{KINDS.find((k) => k.kind === kind)!.label}, page {page} of {pages}. {RULES[kind]}</caption>
              <thead>
                <tr>
                  <th scope="col"><span className="erp-visually-hidden">Select to compare</span></th>
                  <th scope="col" aria-describedby="po-ranking-rule">Rank</th>
                  <th scope="col">Student</th>
                  <th scope="col">Department</th>
                  <th scope="col">Batch</th>
                  <th scope="col" className="po-rank-primary">{valueHeader}</th>
                  {kind !== "academic" && kind !== "developer" && <th scope="col">CGPA</th>}
                  {kind === "academic" && <th scope="col">Semester</th>}
                  {kind === "dsa" && <th scope="col">Contest rating</th>}
                  {kind === "topic" && <th scope="col">Evidence</th>}
                  {kind === "developer" && (
                    <>
                      <th scope="col">Academic (CGPA)</th>
                      <th scope="col">DSA</th>
                      <th scope="col">GitHub</th>
                    </>
                  )}
                  {kind !== "academic" && <th scope="col">Evidence</th>}
                  {kind !== "academic" && <th scope="col">Evidence updated</th>}
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input type="checkbox" name="ids" value={r.id} aria-label={`Select ${r.name} to compare`} />
                    </td>
                    <td className="po-rank">{r.rank ?? <span className="po-rank-none">{unrankedReason(r, kind)}</span>}</td>
                    <td>
                      <span className="po-rank-name">{r.name}</span>
                      <small className="erp-muted">{r.usn}</small>
                    </td>
                    <td title={r.departmentName ?? undefined}>{departmentLabel(r.department)}</td>
                    <td>{r.batch}</td>
                    <td className="po-rank-primary">
                      {kind === "academic" ? (r.cgpa ?? <Status status="missing" />)
                        : kind === "topic" ? (r.topic?.score != null ? formatScore(r.topic.score) : "Insufficient evidence")
                        : <ScoreCell score={r.scores[kind]} status={r.statuses[kind]} developer={kind === "developer"} />}
                      {kind === "dsa" && <NameMatch value={r.leetcodeNameMatch} />}
                    </td>
                    {kind !== "academic" && kind !== "developer" && <td>{r.cgpa ?? "Not recorded"}</td>}
                    {kind === "academic" && <td>{r.semester ?? "Not recorded"}</td>}
                    {kind === "dsa" && <td>{r.contestRating ?? "None"}</td>}
                    {kind === "topic" && <td className="po-rank-wrap">{topicSummary(r)}</td>}
                    {kind === "developer" && (
                      <>
                        <td><ScoreCell score={r.scores.academic} status={r.statuses.academic} />{r.cgpa && <small className="erp-muted">CGPA {r.cgpa}</small>}</td>
                        <td><ScoreCell score={r.scores.dsa} status={r.statuses.dsa} /></td>
                        <td><ScoreCell score={r.scores.github} status={r.statuses.github} /></td>
                      </>
                    )}
                    {kind !== "academic" && <td><span className={`po-status po-rank-evidence-${r.evidenceState}`}>{EVIDENCE_LABELS[r.evidenceState]}</span></td>}
                    {kind !== "academic" && <td>{r.evidenceSyncedAt ? formatWhen(r.evidenceSyncedAt) : "Never"}</td>}
                    <td>
                      <Link href={`/placement/students-ranking/${encodeURIComponent(r.id)}`} aria-label={`View ranking details for ${r.name}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="po-rank-compare-bar">
            <button className="erp-secondary" type="submit">
              <GitCompareArrows size={14} aria-hidden="true" /> Compare selected
            </button>
            <span className="erp-muted">Select two to four students.</span>
          </div>
        </form>
      )}
      <nav className="erp-pagination" aria-label="Ranking pages">
        <span>{total ? `Showing ${from} to ${to} of ${count(total)} students` : "0 students"} · Page {page} of {pages}</span>
        <div>
          {page > 1 && <Link href={rankingHref({ ...query, page: page - 1 > 1 ? String(page - 1) : undefined })}>Previous</Link>}
          {page < pages && <Link href={rankingHref({ ...query, page: String(page + 1) })}>Next</Link>}
        </div>
      </nav>
    </section>
  );
}

// ---- Student detail ---------------------------------------------------------------
const place = (p: Position | undefined) => (p?.rank ? `${p.rank} of ${count(p.of)}` : "Not ranked");

function ComponentPanel({ title, result, children }: { title: string; result: ComponentResult; children?: React.ReactNode }) {
  return (
    <section className="erp-panel po-rank-component" aria-labelledby={`po-rank-${title}`}>
      <div className="po-rank-component-head">
        <h3 id={`po-rank-${title}`}>{title}</h3>
        <strong>{result.score === null ? <Status status={result.status} /> : formatScore(result.score)}</strong>
      </div>
      {result.reason && <p className="po-note">{result.reason}</p>}
      {children}
    </section>
  );
}
const ex = (r: ComponentResult) => r.explanation as Record<string, unknown>;
const fact = (label: string, value: React.ReactNode) => (
  <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
);

function ProjectTable({ projects }: { projects: TopProject[] }) {
  if (!projects.length) return null;
  return (
    <div className="erp-table-scroll" tabIndex={0} role="region" aria-label="Scored projects">
      <table className="erp-table po-table po-rank-parts">
        <caption className="erp-visually-hidden">Rubric points for the scored repositories</caption>
        <thead>
          <tr>
            <th scope="col">Repository</th>
            <th scope="col">Score</th>
            {Object.keys(PART_LABELS).map((k) => <th scope="col" key={k}>{PART_LABELS[k]}</th>)}
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.name}>
              <td>
                <a href={p.url} rel="noreferrer" target="_blank">{p.name}</a>
                <small className="erp-muted">Weight {p.weight}{p.organization ? " · Organisation repository, credited by commit share" : ""}</small>
              </td>
              <td>{formatScore(p.score)}</td>
              {Object.keys(PART_LABELS).map((k) => {
                const part = p.parts[k];
                return <td key={k}>{part ? `${part.earned} / ${part.observedMax}` : "None"}{part && part.observedMax < part.max ? <small className="erp-muted">{part.max - part.observedMax} not observable</small> : null}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RankingDetail({ data }: { data: RankingStudent }) {
  const s = data.student;
  const score = data.score;
  const pos = data.positions;
  const groups = (["dsa", "software", "core-cs", "specialization"] as const).map((family) => ({ family, topics: data.topics.filter((t) => t.family === family) }));
  return (
    <>
      <p className="erp-eyebrow">DSU / PLACEMENT OFFICER / STUDENTS RANKING</p>
      <div className="po-heading">
        <div>
          <h1>{s.name}</h1>
          <p className="erp-muted">{s.usn} · {departmentLabel(s.department, s.departmentName)} · Batch {s.batch}{s.semester ? ` · Semester ${s.semester}` : ""}</p>
        </div>
        <div className="po-actions">
          <Link className="erp-secondary" href="/placement/students-ranking">Back to rankings</Link>
          <Link className="erp-primary" href={`/placement/students/${encodeURIComponent(s.id)}`}>Full student profile</Link>
        </div>
      </div>
      {!score ? (
        <p className="erp-empty">This student has not been calculated yet. Scores appear after the next background pass.</p>
      ) : (
        <>
          <section className="erp-panel" aria-labelledby="po-rank-positions">
            <h2 id="po-rank-positions">Ranking positions</h2>
            <div className="erp-table-scroll" tabIndex={0} role="region" aria-label="Ranking positions">
              <table className="erp-table po-table po-rank-rowheads">
                <thead>
                  <tr><th scope="col">Ranking</th><th scope="col">Score</th><th scope="col">University</th><th scope="col">Batch {s.batch}</th><th scope="col">Department in batch</th></tr>
                </thead>
                <tbody>
                  <tr><th scope="row">CGPA</th><td>{s.cgpa ?? "Not recorded"}</td><td>{place(pos?.academic.university)}</td><td>{place(pos?.academic.batch)}</td><td>{place(pos?.academic.department)}</td></tr>
                  <tr><th scope="row">DSA / LeetCode</th><td><ScoreCell score={score.dsa} status={score.statuses.dsa} /></td><td>{place(pos?.dsa.university)}</td><td>{place(pos?.dsa.batch)}</td><td>Not applicable</td></tr>
                  <tr><th scope="row">GitHub projects</th><td><ScoreCell score={score.github} status={score.statuses.github} /></td><td>{place(pos?.github.university)}</td><td>{place(pos?.github.batch)}</td><td>Not applicable</td></tr>
                  <tr><th scope="row">Developer (provisional)</th><td><ScoreCell score={score.developer} status={score.statuses.developer} developer /></td><td>{place(pos?.developer.university)}</td><td>{place(pos?.developer.batch)}</td><td>Not applicable</td></tr>
                </tbody>
              </table>
            </div>
            <dl className="po-facts po-rank-meta">
              {fact("Evidence", EVIDENCE_LABELS[score.evidenceState])}
              {fact("Weighted coverage", `${Math.round(score.coverage * 100)}% of the developer score has evidence`)}
              {fact("Evidence last collected", formatWhen(score.evidenceSyncedAt))}
              {fact("Last calculated", formatWhen(score.calculatedAt))}
              {fact("Scoring model", data.modelVersion ?? "None")}
            </dl>
          </section>

          <div className="po-rank-components">
            <ComponentPanel title="Developer score" result={score.explanation.developer}>
              {score.explanation.developer.score !== null ? (
                <dl className="po-facts">
                  {Object.entries((ex(score.explanation.developer).contributions ?? {}) as Record<string, number>).map(([k, v]) =>
                    fact(`${{ academic: "Academic", dsa: "DSA", github: "GitHub" }[k] ?? k} contribution`, formatScore(v)))}
                  {fact("Formula", String(ex(score.explanation.developer).formula ?? ""))}
                </dl>
              ) : (
                <ul className="po-rank-reasons">
                  {((ex(score.explanation.developer).blockers ?? []) as string[]).map((b) => <li key={b}>{b}</li>)}
                </ul>
              )}
              <p className="po-note">{String(ex(score.explanation.developer).note ?? "Provisional. Never a basis for automatic rejection.")}</p>
            </ComponentPanel>

            <ComponentPanel title="Academic" result={score.explanation.academic}>
              <dl className="po-facts">
                {fact("Official CGPA", s.cgpa ?? "Not recorded")}
                {fact("Formula", String(ex(score.explanation.academic).formula ?? "Not scored"))}
              </dl>
            </ComponentPanel>

            <ComponentPanel title="DSA / LeetCode" result={score.explanation.dsa}>
              {score.explanation.dsa.score !== null && (
                <dl className="po-facts">
                  {fact("Solved (easy / medium / hard)", `${ex(score.explanation.dsa).easy} / ${ex(score.explanation.dsa).medium} / ${ex(score.explanation.dsa).hard}`)}
                  {fact("Volume part", formatScore(ex(score.explanation.dsa).volume as number))}
                  {fact("Advanced part", formatScore(ex(score.explanation.dsa).advanced as number))}
                  {fact("Contest rating", ex(score.explanation.dsa).contestRating == null ? "No contests" : `${ex(score.explanation.dsa).contestRating} (shown, not scored)`)}
                  {fact("Name check", ex(score.explanation.dsa).nameMatch ? (
                    <>
                      <NameMatch value={ex(score.explanation.dsa).nameMatch as string} />
                      <small className="erp-muted po-rank-block">
                        {ex(score.explanation.dsa).nameMatchSource === "profile_name" ? "LeetCode profile name compared with the official name." : ex(score.explanation.dsa).nameMatchSource === "username" ? "LeetCode username compared with the official name." : "Neither the username nor the LeetCode profile name resembles the official name."} A plausibility check, not proof of ownership.
                      </small>
                    </>
                  ) : "Not checked yet")}
                  {fact("Formula", String(ex(score.explanation.dsa).formula))}
                  {fact("Collected", formatWhen(ex(score.explanation.dsa).syncedAt as string))}
                </dl>
              )}
            </ComponentPanel>

            <ComponentPanel title="GitHub projects" result={score.explanation.github}>
              {score.explanation.github.score !== null && (
                <>
                  <dl className="po-facts">
                    {fact("Original public repositories", String(ex(score.explanation.github).repositoriesConsidered ?? 0))}
                    {fact("Organisation repositories counted", `${ex(score.explanation.github).organizationRepositoriesCounted ?? 0} of ${ex(score.explanation.github).organizationRepositoriesFound ?? 0} found`)}
                    {fact("Repositories scored", String(ex(score.explanation.github).repositoriesScored ?? 0))}
                    {fact("Breadth points", String((ex(score.explanation.github).breadth as { points?: number })?.points ?? 0))}
                    {fact("Formula", String(ex(score.explanation.github).formula))}
                    {fact("Collected", formatWhen(ex(score.explanation.github).syncedAt as string))}
                  </dl>
                  <ProjectTable projects={(ex(score.explanation.github).top ?? []) as TopProject[]} />
                  <p className="po-note">{String(ex(score.explanation.github).note ?? "")}</p>
                </>
              )}
            </ComponentPanel>
          </div>
        </>
      )}

      <section className="erp-panel" aria-labelledby="po-rank-topics">
        <h2 id="po-rank-topics">Topic evidence</h2>
        <p className="po-note">DSA topics come from LeetCode problems solved with that tag. Project areas come from the strongest classified repository. Core subjects are not assessed by v1 sources and wait for MSE, semester-end and lab results.</p>
        {groups.map(({ family, topics }) => (
          <div key={family} className="po-rank-topic-group">
            <h3>{FAMILY_LABELS[family]}</h3>
            <dl className="po-facts">
              {topics.map((t) => fact(t.label,
                t.score !== null ? `${formatScore(t.score)}${t.stale ? " (stale)" : ""}${t.evidence?.solved !== undefined ? `, ${t.evidence.solved} problems` : t.evidence?.repositories?.[0] ? `, ${t.evidence.repositories[0].name}` : ""}`
                  : t.source ? "Insufficient verified evidence" : "Not yet assessed"))}
            </dl>
          </div>
        ))}
      </section>
    </>
  );
}

// ---- Comparison ---------------------------------------------------------------
export function RankingComparison({ students }: { students: RankingStudent[] }) {
  const rows: [string, (d: RankingStudent) => React.ReactNode][] = [
    ["USN", (d) => d.student.usn],
    ["Department", (d) => departmentLabel(d.student.department)],
    ["Batch", (d) => d.student.batch],
    ["CGPA", (d) => d.student.cgpa ?? "Not recorded"],
    ["CGPA rank (university)", (d) => place(d.positions?.academic.university)],
    ["DSA score", (d) => (d.score ? <ScoreCell score={d.score.dsa} status={d.score.statuses.dsa} /> : "Not calculated")],
    ["GitHub score", (d) => (d.score ? <ScoreCell score={d.score.github} status={d.score.statuses.github} /> : "Not calculated")],
    ["Developer score (provisional)", (d) => (d.score ? <ScoreCell score={d.score.developer} status={d.score.statuses.developer} developer /> : "Not calculated")],
    ["Evidence", (d) => (d.score ? EVIDENCE_LABELS[d.score.evidenceState] : "Pending")],
    ["Evidence last collected", (d) => formatWhen(d.score?.evidenceSyncedAt)],
  ];
  const topicCodes = [...new Set(students.flatMap((d) => d.topics.filter((t) => t.score !== null).map((t) => t.code)))];
  const label = (code: string) => students[0]?.topics.find((t) => t.code === code)?.label ?? code;
  return (
    <section className="erp-panel" aria-labelledby="po-rank-compare">
      <h2 id="po-rank-compare">Comparison</h2>
      <p className="po-note">Only evidenced topics are listed. A blank topic means no verified evidence, not a low score.</p>
      <div className="erp-table-scroll" tabIndex={0} role="region" aria-label="Student comparison">
        <table className="erp-table po-table po-rank-compare po-rank-rowheads">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              {students.map((d) => <th scope="col" key={d.student.id}><Link href={`/placement/students-ranking/${encodeURIComponent(d.student.id)}`}>{d.student.name}</Link></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, value]) => (
              <tr key={name}><th scope="row">{name}</th>{students.map((d) => <td key={d.student.id}>{value(d)}</td>)}</tr>
            ))}
            {topicCodes.map((code) => (
              <tr key={code}>
                <th scope="row">{label(code)}</th>
                {students.map((d) => {
                  const t = d.topics.find((x) => x.code === code);
                  return <td key={d.student.id}>{t?.score != null ? formatScore(t.score) : "No verified evidence"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
