import Link from "next/link";
import { text, type Row } from "@/features/placement/lib/types";

const finite = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
// Missing values are a dash, never a zero; zeros are shown but de-emphasised.
const count = (value: unknown) => {
  const n = finite(value);
  return n === null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};
const lpa = (value: unknown) => {
  const n = finite(value);
  return n === null ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function Cell({ value, format = count, start = false }: { value: unknown; format?: (v: unknown) => string; start?: boolean }) {
  const n = finite(value);
  return (
    <td className={`po-num${start ? " po-group-start" : ""}${n === 0 ? " po-zero" : ""}`}>
      {format(value)}
    </td>
  );
}

function Rate({ value, start = false }: { value: unknown; start?: boolean }) {
  const n = finite(value);
  return (
    <td className={`po-num po-rate${start ? " po-group-start" : ""}`}>
      {n === null ? (
        "—"
      ) : (
        <>
          <span>{`${n.toFixed(1)}%`}</span>
          <i aria-hidden="true"><b style={{ width: `${Math.min(Math.max(n, 0), 100)}%` }} /></i>
        </>
      )}
    </td>
  );
}

const GROUPS = [
  { title: "Recruitment", columns: ["Registered", "Selected", "Selection rate"] },
  { title: "Offers", columns: ["Offers", "Hired", "Accepted", "Acceptance rate"] },
  { title: "Package (LPA)", columns: ["Average", "Highest"] },
  { title: "Offers by tier", columns: ["Regular", "Dream", "Super dream", "Mega"] },
];

/** Company recruitment performance, grouped into readable sections. The
 * company column stays pinned while the figures scroll horizontally. */
export function CompanyReportTable({ rows, companyHref }: { rows: Row[]; companyHref: (row: Row) => string }) {
  if (!rows.length)
    return <p className="erp-empty">No recorded data matches this selection.</p>;
  return (
    <div className="erp-table-scroll po-company-table-wrap" tabIndex={0} role="region" aria-label="Company recruitment performance">
      <table className="erp-table po-table po-company-table">
        <caption className="erp-visually-hidden">Company recruitment performance</caption>
        <thead>
          <tr className="po-group-row">
            <th scope="col" rowSpan={2} className="po-company-col">Company</th>
            <th scope="col" rowSpan={2} className="po-num">Drives</th>
            {GROUPS.map((group) => (
              <th key={group.title} scope="colgroup" colSpan={group.columns.length} className="po-group-start">
                {group.title}
              </th>
            ))}
          </tr>
          <tr>
            {GROUPS.flatMap((group) =>
              group.columns.map((column, index) => (
                <th key={`${group.title}-${column}`} scope="col" className={`po-num${index === 0 ? " po-group-start" : ""}`}>
                  {column}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={text(r.id || i)}>
              <th scope="row" className="po-company-col">
                <Link href={companyHref(r)}>{text(r.name)}</Link>
              </th>
              <Cell value={r.drives} />
              <Cell value={r.registered} start />
              <Cell value={r.selected} />
              <Rate value={r.selection_percentage} />
              <Cell value={r.offers} start />
              <Cell value={r.hired} />
              <Cell value={r.accepted} />
              <Rate value={r.acceptance_percentage} />
              <Cell value={r.average} format={lpa} start />
              <Cell value={r.highest} format={lpa} />
              <Cell value={r.regular} start />
              <Cell value={r.dream} />
              <Cell value={r.super_dream} />
              <Cell value={r.mega} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
