import Link from "next/link";
import { notFound } from "next/navigation";
import { campusApi, CampusError, membership } from "@/lib/campus-api";
type RecordData = {
  id: string;
  full_name: string;
  enrollment_no: string;
  course_name: string | null;
  department_name: string | null;
  current_semester: string | null;
  current_batch: string | null;
  current_division: string | null;
  status: string | null;
  source_batch: string;
  academic: Record<string, string | number | null> | null;
  contact: Record<string, string | null> | null;
  fees: Record<string, string | null> | null;
};
const labels: Record<string, string> = {
  attendance: "Attendance (%)",
  achievements: "Achievements",
  cgpa: "CGPA",
  percentage: "Cumulative percentage",
  sgpa: "Last SGPA",
  current_backlog: "Current backlogs",
  total_backlog: "Total backlogs",
  fees_paid: "Fees paid",
  fees_outstanding: "Outstanding balance",
  fee_category: "Fee category",
  email: "Email",
  phoneStudent1: "Student phone",
  whatsappNo: "WhatsApp",
  gender: "Gender",
  motherTongueLanguageName: "Mother tongue",
  region: "Region",
  presentCity: "City",
  presentDistrictName: "District",
  presentStateName: "State",
  presentCountryName: "Country",
  fatherName: "Father’s name",
  motherName: "Mother’s name",
  fatherMobile: "Father’s phone",
  motherMobile: "Mother’s phone",
};
function Details({
  title,
  data,
}: {
  title: string;
  data: Record<string, string | number | null>;
}) {
  return (
    <section className="erp-panel">
      <h2>{title}</h2>
      <dl className="erp-details">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <dt>{labels[key] || key}</dt>
            <dd>{value ?? "Not provided"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const access = await membership();
  let data: RecordData;
  try {
    data = (await campusApi<{ data: RecordData }>(`/students/${id}`)).data;
  } catch (e) {
    if (e instanceof CampusError && e.status === 404) notFound();
    throw e;
  }
  return (
    <>
      {access.role !== "student" && (
        <Link href="/portal/students" className="erp-back">
          ← Student directory
        </Link>
      )}
      <p className="erp-eyebrow">STUDENT RECORD / {data.enrollment_no}</p>
      <div className="erp-page-heading">
        <div>
          <h1>{data.full_name}</h1>
          <p>
            {data.department_name || "Department not provided"} · Batch{" "}
            {data.source_batch}
          </p>
        </div>
        <span className="erp-role">{data.status || "Status not provided"}</span>
      </div>
      <Details
        title="University details"
        data={{
          Course: data.course_name,
          Semester: data.current_semester,
          Batch: data.current_batch,
          Division: data.current_division,
        }}
      />
      {data.academic && (
        <Details title="Academic progress" data={data.academic} />
      )}{" "}
      {data.fees && <Details title="Fee summary" data={data.fees} />}{" "}
      {data.contact && (
        <Details title="Contact information" data={data.contact} />
      )}
    </>
  );
}
