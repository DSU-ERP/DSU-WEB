import { Facts, Metrics, Table, offerColumns } from "@/components/placement/UI";
import { text, type Row } from "@/lib/placement/types";

// Full student record rendering, shared by the student journey route and the
// Student analytics search so both always show the same profile.
export function StudentProfile({ student }: { student: Row }) {
  const offers = student.offers as Row[],
    registrations = student.registrations as Row[],
    timeline = student.timeline as Row[];
  const active = offers.filter((o) => o.active),
    highest = offers.length
      ? Math.max(...offers.map((o) => Number(o.package_lpa)))
      : null;
  const current = active.sort(
    (a, b) => Number(b.package_lpa) - Number(a.package_lpa),
  )[0];
  const cleared = registrations.reduce(
    (sum, r) =>
      sum +
      (Array.isArray(r.results)
        ? (r.results as Row[]).filter((v) => v.result === "pass").length
        : 0),
    0,
  );
  return (
    <>
      <p className="erp-eyebrow">
        {text(student.usn)} · {text(student.department)}
      </p>
      <h1>{text(student.name)}</h1>
      <p className="erp-muted">
        Current placement:{" "}
        {current
          ? `${text(current.category)} · ${text(current.package_lpa)} LPA`
          : "No active offers"}
      </p>
      <Metrics
        data={{
          drives_applied: registrations.length,
          rounds_cleared: cleared,
          active_offers: active.length,
          highest_package: highest,
        }}
        keys={[
          "drives_applied",
          "rounds_cleared",
          "active_offers",
          "highest_package",
        ]}
      />
      <div className="po-split">
        <section className="erp-panel">
          <h2>Academic &amp; admission profile</h2>
          <Facts
            data={{
              ...(student.profile as Row),
              ...(student.academic as Row),
              cgpa: student.cgpa,
              sgpa: student.sgpa,
              baseline_eligibility:
                student.eligible === null
                  ? "Unclassified"
                  : student.eligible
                    ? "Eligible"
                    : "Not Eligible",
            }}
          />
        </section>
        <section className="erp-panel">
          <h2>Contact &amp; family</h2>
          {student.contact ? (
            <Facts data={student.contact as Row} />
          ) : (
            <p>No contact information recorded.</p>
          )}
        </section>
      </div>
      <section className="erp-panel">
        <h2>Drive participation &amp; round history</h2>
        <Table
          caption="Student registrations"
          rows={registrations}
          columns={[
            { key: "drive", link: (r) => `/placement/drives/${r.drive_id}` },
            { key: "company" },
            { key: "status" },
            { key: "current_round" },
            { key: "created_at", title: "Registered" },
          ]}
          details={(r) => (
            <>
              {(r.results as Row[]).length ? (
                (r.results as Row[]).map((result, i) => (
                  <Facts key={i} data={result} />
                ))
              ) : (
                <p>No round results recorded.</p>
              )}
            </>
          )}
        />
      </section>
      <section className="erp-panel">
        <h2>All offers</h2>
        <Table
          caption="Student offer history"
          rows={offers}
          columns={offerColumns.filter(
            (c) => !["name", "usn", "department"].includes(c.key),
          )}
        />
      </section>
      {student.prediction && (
        <section className="erp-panel">
          <h2>Existing career insight</h2>
          <Facts data={student.prediction as Row} />
        </section>
      )}
      {student.points && (
        <section className="erp-panel">
          <h2>Recorded points</h2>
          <Facts data={student.points as Row} />
        </section>
      )}
      <section className="erp-panel">
        <h2>Recruitment timeline</h2>
        <p className="po-note">
          The most recent 200 recorded events are shown.
        </p>
        {timeline.length ? (
          <ol className="po-timeline">
            {timeline.map((event, i) => (
              <li key={i}>
                <time>
                  {new Date(String(event.created_at)).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </time>
                <strong>{text(event.action).replaceAll(".", " · ")}</strong>
                <Facts data={event.details as Row} />
              </li>
            ))}
          </ol>
        ) : (
          <p>No recruitment activity recorded.</p>
        )}
      </section>
    </>
  );
}
