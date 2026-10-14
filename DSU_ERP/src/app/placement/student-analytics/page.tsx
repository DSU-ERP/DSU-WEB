import Link from "next/link";
import { officerSession, placementRead } from "@/lib/placement/server";
import { StudentProfile } from "@/components/placement/StudentProfile";
import { Table } from "@/components/placement/UI";
import { text, type Report, type Row } from "@/lib/placement/types";

const UUID = /^[0-9a-f-]{36}$/i;
const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value.trim() : "";

function SearchBar({ term }: { term: string }) {
  return (
    <form className="po-student-search" action="/placement/student-analytics">
      <label htmlFor="student-search">Search by USN or name</label>
      <div className="po-student-search-row">
        <input
          id="student-search"
          name="q"
          type="search"
          defaultValue={term}
          placeholder="e.g. ENG23CT1002 or Shreyas"
          autoComplete="off"
          maxLength={100}
        />
        <button className="erp-primary" type="submit">
          Search
        </button>
      </div>
    </form>
  );
}

export default async function StudentAnalytics({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await officerSession();
  const params = await searchParams;
  const term = one(params.q).slice(0, 100),
    selected = one(params.id);

  // An explicit pick from the result list, or a single unambiguous match,
  // opens the full profile in place.
  if (UUID.test(selected)) {
    const student = await placementRead<Row>("student", { id: selected });
    return (
      <>
        <p className="erp-eyebrow">DSU / PLACEMENT OFFICER</p>
        <h1>Student analytics</h1>
        <SearchBar term={term} />
        <StudentProfile student={student} />
      </>
    );
  }

  if (!term)
    return (
      <>
        <p className="erp-eyebrow">DSU / PLACEMENT OFFICER</p>
        <h1>Student analytics</h1>
        <p className="erp-muted">
          Search a student by USN or name to open their complete recorded
          profile.
        </p>
        <SearchBar term={term} />
      </>
    );

  const data = await placementRead<Report>("students", {
    search: term,
    limit: "25",
  });
  const matches = data.rows ?? [];

  if (matches.length === 1) {
    const student = await placementRead<Row>("student", {
      id: String(matches[0].id),
    });
    return (
      <>
        <p className="erp-eyebrow">DSU / PLACEMENT OFFICER</p>
        <h1>Student analytics</h1>
        <SearchBar term={term} />
        <p className="po-note">
          One student matches “{term}”. Showing their complete profile.
        </p>
        <StudentProfile student={student} />
      </>
    );
  }

  return (
    <>
      <p className="erp-eyebrow">DSU / PLACEMENT OFFICER</p>
      <h1>Student analytics</h1>
      <SearchBar term={term} />
      {matches.length ? (
        <>
          <p className="po-note">
            {data.pagination.total} students match “{term}”
            {data.pagination.total > matches.length
              ? `. Showing the first ${matches.length}; refine the search to narrow it down.`
              : ". Select one to open their complete profile."}
          </p>
          <section className="erp-panel">
            <Table
              caption={`Students matching ${term}`}
              rows={matches}
              columns={[
                {
                  key: "usn",
                  title: "USN",
                  link: (r) =>
                    `/placement/student-analytics?q=${encodeURIComponent(term)}&id=${r.id}`,
                },
                { key: "name" },
                { key: "department" },
                { key: "batch" },
                { key: "cgpa", numeric: true },
              ]}
            />
          </section>
        </>
      ) : (
        <section className="erp-panel">
          <p>
            No student matches “{text(term)}”. Check the USN or try part of the
            student&rsquo;s name.
          </p>
        </section>
      )}
    </>
  );
}
