import type { StudentRecord } from "../lib/server";

export function StudentOverview({ student }: { student: StudentRecord }) {
  const value = (field: string) => student.academic?.[field] ?? "Not recorded";
  return (
    <>
      <p className="erp-eyebrow">YOUR STUDENT WORKSPACE</p>
      <div className="erp-page-heading">
        <div>
          <h1>{student.full_name}</h1>
          <p>
            {student.enrollment_no} ·{" "}
            {student.department_name || "Department not recorded"}
          </p>
        </div>
      </div>
      <div className="erp-metrics">
        {[
          ["CGPA", value("cgpa")],
          ["Attendance (%)", value("attendance")],
          ["Current backlogs", value("current_backlog")],
        ].map(([label, content]) => (
          <article key={String(label)}>
            <span>{label}</span>
            <strong>{content}</strong>
          </article>
        ))}
      </div>
      <section className="erp-panel">
        <h2>Your university record</h2>
        <dl className="erp-details">
          {[
            ["USN", student.enrollment_no],
            ["Course", student.course_name],
            ["Department", student.department_name],
            ["Semester", student.current_semester],
            ["Batch", student.source_batch],
          ].map(([label, content]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{content ?? "Not recorded"}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
