import Link from "next/link";
import { redirect } from "next/navigation";
import { campusApi, membership } from "@/lib/campus-api";
type Student = {
  id: string;
  enrollment_no: string;
  full_name: string;
  department_short_name: string | null;
  source_batch: string;
  current_semester: string | null;
  cgpa: string | null;
  attendance: string | null;
  category: { name: string } | null;
};
export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await membership();
  if (access.role === "student") redirect("/portal");
  const params = await searchParams;
  const search =
    typeof params.search === "string" ? params.search.slice(0, 100) : "";
  const batch =
    typeof params.batch === "string" && /^20\d{2}$/.test(params.batch)
      ? params.batch
      : "";
  const page = Math.min(100000, Math.max(1, Number(params.page) || 1));
  const query = new URLSearchParams({
    search,
    page: String(Math.floor(page)),
    limit: "25",
    ...(batch ? { batch } : {}),
  });
  const result = await campusApi<{
    data: Student[];
    pagination: { total: number; page: number; limit: number };
  }>(`/students?${query}`);
  const pageLink = (p: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(p));
    return `/portal/students?${next}`;
  };
  return (
    <>
      <p className="erp-eyebrow">STUDENT DIRECTORY</p>
      <div className="erp-page-heading">
        <div>
          <h1>People make a campus.</h1>
          <p>
            {result.pagination.total.toLocaleString("en-IN")} matching student
            records
          </p>
        </div>
      </div>
      <form className="erp-search" role="search">
        <label>
          Student name or enrollment
          <input
            name="search"
            placeholder="Search from the beginning of a name…"
            defaultValue={search}
            maxLength={100}
          />
        </label>
        <label>
          Batch
          <input
            name="batch"
            placeholder="All batches"
            defaultValue={batch}
            inputMode="numeric"
            pattern="20[0-9]{2}"
            maxLength={4}
          />
        </label>
        <button className="erp-primary">Search</button>
        <Link className="erp-secondary" href="/portal/students">
          Clear
        </Link>
      </form>
      <section className="erp-panel">
        {!result.data.length ? (
          <p className="erp-empty">
            No matching students. Try a different name, enrollment number, or
            batch.
          </p>
        ) : (
          <div
            className="erp-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Student records"
          >
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Batch</th>
                  <th>Semester</th>
                  <th>CGPA</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/portal/students/${s.id}`}>
                        {s.full_name}
                        <small>{s.enrollment_no}</small>
                      </Link>
                    </td>
                    <td>{s.department_short_name || "—"}</td>
                    <td>{s.source_batch}</td>
                    <td>{s.current_semester || "—"}</td>
                    <td>
                      {s.cgpa ?? "—"}
                      <small>{s.category?.name || "Unclassified"}</small>
                    </td>
                    <td>{s.attendance !== null ? `${s.attendance}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="erp-pagination">
          <span>
            Page {result.pagination.page} of{" "}
            {Math.max(1, Math.ceil(result.pagination.total / 25))}
          </span>
          <div>
            {page > 1 && <Link href={pageLink(page - 1)}>← Previous</Link>}
            {page * 25 < result.pagination.total && (
              <Link href={pageLink(page + 1)}>Next →</Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
