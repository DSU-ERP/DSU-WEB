"use client";
import { useState } from "react";
export type AssignedTest = {
  id: string;
  title: string;
  batch: string;
  published: boolean;
  opens_at: string;
  closes_at: string;
  config: { durationMinutes: number };
};
export type CampusEvent = {
  id: string;
  title: string;
  batch: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  location: string;
};
export type CampusNotice = {
  id: string;
  title: string;
  body: string;
  batch: string;
  created_at: string;
};
type Question = {
  section: string;
  type: "mcq" | "short";
  question: string;
  options: string[];
  correctIndex: number | null;
  expectedPoints: string[];
  marks: number;
  explanation: string;
};
type Result = {
  id: string;
  identity: { name: string; usn: string };
  status: string;
  started_at: string;
  result: { percentage: number; score: number; maximum: number } | null;
  integrity: unknown[];
};
const blank = (): Question => ({
  section: "Placement preparation",
  type: "mcq",
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  expectedPoints: [],
  marks: 1,
  explanation: "",
});
async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch("/placement/tools-api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw Error(json.error || "Request failed.");
  return json.data;
}
function exportResults(rows: Result[]) {
  const cell = (v: unknown) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\t\r-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const data = [
    [
      "USN",
      "Name",
      "Status",
      "Score",
      "Maximum",
      "Percentage",
      "Browser events",
    ],
    ...rows.map((r) => [
      r.identity.usn,
      r.identity.name,
      r.status,
      r.result?.score,
      r.result?.maximum,
      r.result?.percentage,
      r.integrity.length,
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([data], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "assigned-test-results.csv";
  a.click();
  URL.revokeObjectURL(url);
}
export function StudentTools({
  initialTests,
  initialEvents,
  initialNotices,
}: {
  initialTests: AssignedTest[];
  initialEvents: CampusEvent[];
  initialNotices: CampusNotice[];
}) {
  const [tab, setTab] = useState("Assessments"),
    [tests, setTests] = useState(initialTests),
    [events, setEvents] = useState(initialEvents),
    [notices, setNotices] = useState(initialNotices),
    [questions, setQuestions] = useState<Question[]>([blank()]),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [results, setResults] = useState<Result[] | null>(null),
    [resultTitle, setResultTitle] = useState("");
  const change = (index: number, patch: Partial<Question>) =>
    setQuestions((rows) =>
      rows.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  const action = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const createTest = (form: HTMLFormElement) =>
    action(async () => {
      const f = new FormData(form);
      const result = await api<{ code: string }>("assessments", {
        title: f.get("title"),
        className: f.get("className"),
        portions: f.get("portions"),
        batch: f.get("batch"),
        opensAt: new Date(String(f.get("opensAt"))).toISOString(),
        closesAt: new Date(String(f.get("closesAt"))).toISOString(),
        durationMinutes: Number(f.get("durationMinutes")),
        proctored: f.get("proctored") === "on",
        published: f.get("published") === "on",
        questions: questions.map((q) => ({
          ...q,
          options: q.type === "mcq" ? q.options : [],
          correctIndex: q.type === "mcq" ? q.correctIndex : null,
          expectedPoints: q.type === "short" ? q.expectedPoints : [],
        })),
      });
      setCode(result.code);
      setTests(await api("assessments"));
      setSuccess(
        "Assessment saved. Share its class code directly with the intended cohort.",
      );
      form.reset();
      setQuestions([blank()]);
    });
  const publishEvent = (form: HTMLFormElement) =>
    action(async () => {
      const f = new FormData(form);
      await api("events", {
        batch: f.get("batch"),
        notify: f.get("notify") === "on",
        event: {
          title: f.get("title"),
          kind: f.get("kind"),
          startsAt: new Date(String(f.get("startsAt"))).toISOString(),
          endsAt: new Date(String(f.get("endsAt"))).toISOString(),
          location: f.get("location"),
          description: f.get("description"),
        },
      });
      setEvents(await api("events"));
      setSuccess("Event published to the cohort calendar.");
      form.reset();
    });
  const publishNotice = (form: HTMLFormElement) =>
    action(async () => {
      const f = new FormData(form);
      await api("notices", Object.fromEntries(f));
      setNotices(await api("notices"));
      setSuccess("Announcement published to the selected cohort.");
      form.reset();
    });
  return (
    <section className="po-student-tools">
      <header className="erp-page-heading">
        <p className="erp-eyebrow">PLACEMENT / STUDENT WORKSPACE</p>
        <h1>Help the next step happen.</h1>
        <p>
          Publish assigned tests, cohort events and useful announcements.
          Students see only their cohort’s published records.
        </p>
      </header>
      <div className="erp-actions" role="tablist">
        {["Assessments", "Calendar", "Announcements"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "erp-primary" : "erp-secondary"}
            onClick={() => {
              setTab(t);
              setResults(null);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="po-tool-error">
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
      {code && (
        <aside className="po-tool-code">
          <strong>Class code: {code}</strong>
          <p>
            Copy it now. Only its protected hash is stored. Regenerating a code
            replaces the previous one.
          </p>
          <button className="erp-secondary" onClick={() => setCode("")}>
            Dismiss code
          </button>
        </aside>
      )}
      {tab === "Assessments" && (
        <>
          <form
            className="po-tool-form"
            onSubmit={(e) => {
              e.preventDefault();
              void createTest(e.currentTarget);
            }}
          >
            <h2>Build an assigned assessment</h2>
            <div className="po-tool-fields">
              <label>
                Test title
                <input name="title" minLength={3} maxLength={200} required />
              </label>
              <label>
                Class / group
                <input name="className" maxLength={200} required />
              </label>
              <label>
                Graduation batch
                <input
                  name="batch"
                  pattern="20[0-9]{2}"
                  placeholder="YYYY"
                  required
                />
              </label>
              <label>
                Duration in minutes
                <input
                  name="durationMinutes"
                  type="number"
                  min={5}
                  max={180}
                  defaultValue={30}
                  required
                />
              </label>
              <label>
                Opens at · local time
                <input name="opensAt" type="datetime-local" required />
              </label>
              <label>
                Closes at · local time
                <input name="closesAt" type="datetime-local" required />
              </label>
            </div>
            <label>
              Portions covered
              <textarea name="portions" maxLength={2000} />
            </label>
            {questions.map((q, i) => (
              <fieldset key={i}>
                <legend>Question {i + 1}</legend>
                <div className="po-tool-fields">
                  <label>
                    Section
                    <input
                      value={q.section}
                      onChange={(e) => change(i, { section: e.target.value })}
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Answer format
                    <select
                      value={q.type}
                      onChange={(e) =>
                        change(i, { type: e.target.value as Question["type"] })
                      }
                    >
                      <option value="mcq">Multiple choice</option>
                      <option value="short">Written answer</option>
                    </select>
                  </label>
                  <label>
                    Marks
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={q.marks}
                      onChange={(e) =>
                        change(i, { marks: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <label>
                  Question text
                  <textarea
                    value={q.question}
                    onChange={(e) => change(i, { question: e.target.value })}
                    minLength={5}
                    maxLength={3000}
                    required
                  />
                </label>
                {q.type === "mcq" ? (
                  <div className="po-tool-fields">
                    {q.options.map((option, n) => (
                      <label key={n}>
                        Option {n + 1}
                        <input
                          value={option}
                          maxLength={1000}
                          required
                          onChange={(e) =>
                            change(i, {
                              options: q.options.map((v, k) =>
                                k === n ? e.target.value : v,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Correct option
                      <select
                        value={q.correctIndex ?? 0}
                        onChange={(e) =>
                          change(i, { correctIndex: Number(e.target.value) })
                        }
                      >
                        {q.options.map((_, n) => (
                          <option key={n} value={n}>
                            {n + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <label>
                    Expected points · one per line
                    <textarea
                      required
                      value={q.expectedPoints.join("\n")}
                      onChange={(e) =>
                        change(i, {
                          expectedPoints: e.target.value.split("\n"),
                        })
                      }
                    />
                  </label>
                )}
                <label>
                  Explanation
                  <textarea
                    maxLength={3000}
                    value={q.explanation}
                    onChange={(e) => change(i, { explanation: e.target.value })}
                  />
                </label>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="erp-secondary"
                    onClick={() =>
                      setQuestions((rows) => rows.filter((_, n) => n !== i))
                    }
                  >
                    Remove question
                  </button>
                )}
              </fieldset>
            ))}
            <div className="erp-actions">
              <button
                type="button"
                disabled={questions.length >= 50 || busy}
                className="erp-secondary"
                onClick={() => setQuestions((rows) => [...rows, blank()])}
              >
                Add question
              </button>
              <span>{questions.length}/50 questions</span>
            </div>
            <label className="po-tool-check">
              <input type="checkbox" name="proctored" />
              Require fullscreen and record browser integrity events
            </label>
            <label className="po-tool-check">
              <input type="checkbox" name="published" />
              Publish to students on save
            </label>
            <button disabled={busy} className="erp-primary">
              {busy ? "Saving…" : "Save assessment & generate code"}
            </button>
          </form>
          <section className="po-tool-form">
            <h2>Assigned assessments</h2>
            {!tests.length && <p>No assigned tests have been created.</p>}
            {tests.map((t) => (
              <article className="po-tool-row" key={t.id}>
                <div>
                  <h3>{t.title}</h3>
                  <p>
                    Batch {t.batch} · {t.config.durationMinutes} min ·{" "}
                    {t.published ? "Published" : "Draft"}
                  </p>
                  <small>
                    {new Date(t.opens_at).toLocaleString("en-IN")} –{" "}
                    {new Date(t.closes_at).toLocaleString("en-IN")}
                  </small>
                </div>
                <div className="erp-actions">
                  <button
                    className="erp-secondary"
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        setResults(
                          await api("assessments/" + t.id + "/results"),
                        );
                        setResultTitle(t.title);
                      })
                    }
                  >
                    View results
                  </button>
                  <button
                    className="erp-secondary"
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        await api("assessments/" + t.id + "/publication", {
                          published: !t.published,
                        });
                        setTests(await api("assessments"));
                      })
                    }
                  >
                    {t.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    className="erp-secondary"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Replace the current code? The previous code will stop working.",
                        )
                      )
                        void action(async () =>
                          setCode(
                            (
                              await api<{ code: string }>(
                                "assessments/" + t.id + "/code",
                                {},
                              )
                            ).code,
                          ),
                        );
                    }}
                  >
                    Regenerate code
                  </button>
                </div>
              </article>
            ))}
          </section>
          {results && (
            <section className="po-tool-form">
              <h2>{resultTitle} / results</h2>
              <button
                className="erp-secondary"
                onClick={() => exportResults(results)}
              >
                Export results CSV
              </button>
              <p>
                Browser events are observations, not proof of misconduct.
                Showing up to 100 most recent attempts.
              </p>
              <div className="erp-table-scroll">
                <table className="erp-table">
                  <thead>
                    <tr>
                      {["USN", "Name", "Status", "Score", "Browser events"].map(
                        (x) => (
                          <th key={x}>{x}</th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.id}>
                        <td>{r.identity.usn}</td>
                        <td>{r.identity.name}</td>
                        <td>{r.status}</td>
                        <td>
                          {r.result
                            ? r.result.score + " / " + r.result.maximum
                            : "Pending"}
                        </td>
                        <td>{r.integrity.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!results.length && <p>No attempts recorded.</p>}
              </div>
            </section>
          )}
        </>
      )}
      {tab === "Calendar" && (
        <>
          <form
            className="po-tool-form"
            onSubmit={(e) => {
              e.preventDefault();
              void publishEvent(e.currentTarget);
            }}
          >
            <h2>Publish a cohort event</h2>
            <div className="po-tool-fields">
              <label>
                Event title
                <input name="title" required minLength={2} maxLength={200} />
              </label>
              <label>
                Graduation batch
                <input name="batch" pattern="20[0-9]{2}" required />
              </label>
              <label>
                Event kind
                <select name="kind">
                  {[
                    "class",
                    "interview",
                    "practice",
                    "deadline",
                    "mentoring",
                    "other",
                  ].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Location
                <input name="location" maxLength={200} />
              </label>
              <label>
                Starts at · local time
                <input name="startsAt" type="datetime-local" required />
              </label>
              <label>
                Ends at · local time
                <input name="endsAt" type="datetime-local" required />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" maxLength={3000} />
            </label>
            <label className="po-tool-check">
              <input type="checkbox" name="notify" defaultChecked />
              Send an in-app announcement
            </label>
            <button className="erp-primary" disabled={busy}>
              Publish event
            </button>
          </form>
          <section className="po-tool-form">
            <h2>Cohort calendar</h2>
            {events.map((e) => (
              <article key={e.id} className="po-tool-row">
                <div>
                  <h3>{e.title}</h3>
                  <p>
                    Batch {e.batch} · {e.kind} ·{" "}
                    {new Date(e.starts_at).toLocaleString("en-IN")} ·{" "}
                    {e.location}
                  </p>
                </div>
              </article>
            ))}
            {!events.length && <p>No published events.</p>}
          </section>
        </>
      )}
      {tab === "Announcements" && (
        <>
          <form
            className="po-tool-form"
            onSubmit={(e) => {
              e.preventDefault();
              void publishNotice(e.currentTarget);
            }}
          >
            <h2>Publish an announcement</h2>
            <div className="po-tool-fields">
              <label>
                Title
                <input name="title" required minLength={2} maxLength={200} />
              </label>
              <label>
                Graduation batch
                <input name="batch" pattern="20[0-9]{2}" required />
              </label>
              <label>
                Student destination
                <select name="href">
                  <option value="/student/dashboard">Dashboard</option>
                  <option value="/student/placement">Placements</option>
                  <option value="/student/timetable">Calendar</option>
                  <option value="/student/assessments/faculty-test">
                    Assigned tests
                  </option>
                </select>
              </label>
            </div>
            <label>
              Message
              <textarea name="body" required maxLength={3000} />
            </label>
            <button disabled={busy} className="erp-primary">
              Publish announcement
            </button>
          </form>
          <section className="po-tool-form">
            <h2>Published announcements</h2>
            {notices.map((n) => (
              <article className="po-tool-row" key={n.id}>
                <div>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <small>
                    Batch {n.batch} ·{" "}
                    {new Date(n.created_at).toLocaleString("en-IN")}
                  </small>
                </div>
              </article>
            ))}
            {!notices.length && <p>No announcements yet.</p>}
          </section>
        </>
      )}
    </section>
  );
}
