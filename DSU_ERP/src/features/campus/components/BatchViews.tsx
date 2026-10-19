import Link from "next/link";
import {
  batchQuery,
  SORTS,
  type BatchView,
  type StudentDetail,
} from "@/features/campus/lib/batches";
import { formatCgpa, formatCount } from "@/features/campus/lib/filters";
import { placementStatus } from "@/features/campus/lib/placement";
export function BatchTabs({ data }: { data: BatchView }) {
  return (
    <nav className="erp-batch-tabs" aria-label="Select batch">
      {data.options.batches.map((batch) => (
        <Link
          key={batch}
          aria-current={data.batch === batch ? "page" : undefined}
          href={`/portal/batch-analytics?batch=${batch}`}
        >
          Batch {batch}
        </Link>
      ))}
    </nav>
  );
}
export function BatchMetrics({ data }: { data: BatchView }) {
  const s = data.summary;
  return (
    <>
      <div className="erp-metrics erp-batch-metrics">
        <article>
          <span>Total students</span>
          <strong>{formatCount(s.total)}</strong>
        </article>
        <article>
          <span>CGPA ≥ 6.0</span>
          <strong>{formatCount(s.at_least_six)}</strong>
          <small>
            {s.total ? ((s.at_least_six / s.total) * 100).toFixed(1) : "0.0"}%
            of selected students
          </small>
        </article>
        <article>
          <span>Average valid CGPA</span>
          <strong>{formatCgpa(s.average_cgpa)}</strong>
        </article>
        <article>
          <span>Male / Female</span>
          <strong>
            {data.genderAvailable
              ? `${formatCount(s.male ?? 0)} / ${formatCount(s.female ?? 0)}`
              : "—"}
          </strong>
          <small>
            {data.genderAvailable
              ? `${s.gender_other ?? 0} other / not recorded`
              : "Restricted to administrators"}
          </small>
        </article>
      </div>
      <p className="erp-muted erp-policy-note">
        Placement eligible: {data.placementPolicy.label}. CGPA ≥ 6.0 is a statistical
        count. {formatCount(s.unclassified)} students
        have missing or invalid CGPA.
      </p>
    </>
  );
}
export function BatchFilters({
  data,
  filters,
  path,
  students = false,
}: {
  data: BatchView;
  filters: Record<string, string>;
  path: string;
  students?: boolean;
}) {
  return (
    <form
      key={batchQuery(filters).toString()}
      className="erp-search erp-analytics-filters erp-batch-filters"
      action={path}
      role="search"
    >
      {data.batch && <input type="hidden" name="batch" value={data.batch} />}
      <label>
        Name or USN
        <input
          name="search"
          maxLength={100}
          placeholder="Search name or USN…"
          defaultValue={filters.search ?? ""}
        />
      </label>
      <label>
        Department
        <select name="department" defaultValue={filters.department ?? ""}>
          <option value="">All departments</option>
          {filters.department && filters.department !== "__missing__" && !data.options.departments.includes(filters.department) && <option value={filters.department}>{filters.department} (no records)</option>}
          {data.options.departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
          {(data.options.missing_department || filters.department === "__missing__") && (
            <option value="__missing__">Not recorded</option>
          )}
        </select>
      </label>
      {students && (
        <>
          <label>
            Admission quota
            <select name="quota" defaultValue={filters.quota ?? ""}>
              <option value="">All quotas</option>
              {filters.quota && filters.quota !== "__missing__" && !data.options.quotas.includes(filters.quota) && <option value={filters.quota}>{filters.quota} (no records)</option>}
              {data.options.quotas.map((q) => (
                <option key={q}>{q}</option>
              ))}
              {(data.options.missing_quota || filters.quota === "__missing__") && (
                <option value="__missing__">Not recorded</option>
              )}
            </select>
          </label>
          <label>
            CGPA category
            <select name="category" defaultValue={filters.category ?? ""}>
              <option value="">All CGPAs</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="unclassified">Unclassified</option>
            </select>
          </label>
          <label>
            Sort by
            <select name="sort" defaultValue={filters.sort}>
              {Object.entries(SORTS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Order
            <select name="direction" defaultValue={filters.direction}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </>
      )}
      <button className="erp-primary">Apply</button>
      <Link
        className="erp-secondary"
        href={`${path}?${batchQuery({ batch: data.batch ?? "" })}`}
      >
        Clear
      </Link>
    </form>
  );
}
function DetailBlock({
  title,
  items,
}: {
  title: string;
  items: Record<string, unknown>;
}) {
  return (
    <section className="erp-student-detail-block">
      <h3>{title}</h3>
      <dl>
        {Object.entries(items).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {value === null || value === undefined || value === ""
                ? "Not recorded"
                : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function ExpandedStudent({ student: s }: { student: StudentDetail }) {
  const c = s.contact,
    a = s.academic;
  return (
    <div className="erp-expanded-student">
      <div className="erp-section-heading">
        <h2>{s.full_name}</h2>
        <Link href={`/portal/students/${s.id}`}>Open student record ↗</Link>
      </div>
      <div className="erp-student-detail-grid">
        <DetailBlock
          title="Personal information"
          items={{
            Name: s.full_name,
            USN: s.enrollment_no,
            "Display number": s.display_no,
            ...(c
              ? {
                  Email: c.email,
                  Phone: c.phoneStudent1,
                  WhatsApp: c.whatsappNo,
                  Gender:
                    c.gender === "M"
                      ? "Male"
                      : c.gender === "F"
                        ? "Female"
                        : c.gender,
                  Language: c.motherTongueLanguageName,
                  Region: c.region,
                  City: c.presentCity,
                  District: c.presentDistrictName,
                  State: c.presentStateName,
                  Country: c.presentCountryName,
                }
              : { "Contact information": "Restricted to administrators" }),
          }}
        />
        <DetailBlock
          title="Academic information"
          items={{
            Course: s.course_name,
            Department: s.department_name,
            "Admission year": s.admission_year,
            "Academic year": s.admission_academic_year,
            Type: s.admission_type,
            Quota: s.admission_quota,
            Semester: s.current_semester,
            "Exam semester": s.exam_semester,
            "Class batch": s.current_batch,
            Division: s.current_division,
            "Source batch": s.source_batch,
          }}
        />
        <DetailBlock
          title="Performance"
          items={{
            CGPA: a?.cgpa,
            SGPA: a?.sgpa,
            "Cumulative %": a?.percentage,
            "Attendance %": a?.attendance,
            "Current backlogs": a?.current_backlog,
            "Total backlogs": a?.total_backlog,
            Achievements: a?.achievements,
            Status: s.status,
            "Placement eligibility": placementStatus(s.placement_eligible),
          }}
        />
        {c && (
          <DetailBlock
            title="Family information"
            items={{
              Father: c.fatherName,
              "Father’s phone": c.fatherMobile,
              Mother: c.motherName,
              "Mother’s phone": c.motherMobile,
            }}
          />
        )}
        {s.fees && (
          <DetailBlock
            title="Fees"
            items={{
              Paid: s.fees.fees_paid,
              Outstanding: s.fees.fees_outstanding,
              Category: s.fees.fee_category,
            }}
          />
        )}
      </div>
    </div>
  );
}
