import Link from "next/link";
import { officerSession, placementRankingStudent } from "@/features/placement/lib/server";
import { RankingComparison } from "@/features/placement/components/StudentsRanking";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Side-by-side comparison of two to four students from the ranking table.
export default async function CompareStudents({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await officerSession();
  const raw = (await searchParams).ids;
  const ids = [...new Set((Array.isArray(raw) ? raw : raw ? [raw] : []).filter((id) => UUID.test(id)))];
  const heading = (
    <>
      <p className="erp-eyebrow">DSU / PLACEMENT OFFICER / STUDENTS RANKING</p>
      <div className="po-heading">
        <div>
          <h1>Compare students</h1>
          <p className="erp-muted">Scores, ranks and evidence coverage side by side.</p>
        </div>
        <div className="po-actions">
          <Link className="erp-secondary" href="/placement/students-ranking">Back to rankings</Link>
        </div>
      </div>
    </>
  );
  if (ids.length < 2 || ids.length > 4)
    return (
      <>
        {heading}
        <p className="erp-empty">Select between two and four students in the ranking table, then choose Compare selected.</p>
      </>
    );
  const students = await Promise.all(ids.map((id) => placementRankingStudent(id)));
  return (
    <>
      {heading}
      <RankingComparison students={students} />
    </>
  );
}
