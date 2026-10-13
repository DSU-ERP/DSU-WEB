import Link from "next/link";
import { redirect } from "next/navigation";
import { campusApi, membership } from "@/lib/campus-api";
type Overview = {
  students: number;
  departments: number;
  batches: number;
  departmentBreakdown: { name: string | null; students: number }[];
};
export default async function PortalPage() {
  const access = await membership();
  if (access.role === "student")
    redirect(`/portal/students/${access.studentId}`);
  const { data } = await campusApi<{ data: Overview }>("/overview");
  return (
    <>
      <p className="erp-eyebrow">INSTITUTION OVERVIEW</p>
      <div className="erp-page-heading">
        <div>
          <h1>Your campus, connected.</h1>
          <p>A clear view of the university’s student records.</p>
        </div>
        <Link className="erp-primary" href="/portal/students">
          Explore students ↗
        </Link>
      </div>
      <div className="erp-metrics">
        {[
          ["Student records", data.students],
          ["Departments", data.departments],
          ["Batches", data.batches],
        ].map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{Number(value).toLocaleString("en-IN")}</strong>
          </article>
        ))}
      </div>
      <section className="erp-panel">
        <div className="erp-section-heading">
          <h2>Across departments</h2>
          <span className="erp-muted">Imported student records</span>
        </div>
        {!data.departmentBreakdown.length ? (
          <p className="erp-empty">
            No student records yet. An administrator can import the university
            export to get started.
          </p>
        ) : (
          <ul className="erp-departments">
            {data.departmentBreakdown.map((d) => (
              <li key={d.name || "unknown"}>
                <span>{d.name || "Not specified"}</span>
                <div>
                  <span
                    style={{
                      width: `${Math.max(1, (d.students / Math.max(data.students, 1)) * 100)}%`,
                    }}
                  />
                </div>
                <strong>{d.students.toLocaleString("en-IN")}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
