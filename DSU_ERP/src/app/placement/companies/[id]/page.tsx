import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/lib/placement/server";
import type { Row } from "@/lib/placement/types";
import { ChangeForm, DeleteRecord } from "@/components/placement/Controls";
export default async function CompanyEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await officerSession();
  const { id } = await params,
    newRecord = id === "new";
  if (!newRecord && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const company = newRecord ? {} : await placementRead<Row>("company", { id });
  const fields = [
    ["name", "Company name", "text"],
    ["short_name", "Short name", "text"],
    ["industry", "Industry", "text"],
    ["website", "Website", "url"],
    ["hr_name", "HR contact name", "text"],
    ["hr_email", "HR email", "email"],
    ["hr_phone", "HR phone", "tel"],
  ];
  return (
    <>
      <Link className="erp-back" href="/placement/companies">
        ← Companies
      </Link>
      <h1>{newRecord ? "Add a recruiting company." : "Company details."}</h1>
      <section className="erp-panel">
        <ChangeForm
          action="company.save"
          base={newRecord ? {} : { id, revision: company.revision }}
          destination="/placement/companies"
        >
          <div className="po-split">
            {fields.map(([key, title, type]) => (
              <label key={key}>
                {title}
                <input
                  name={key}
                  type={type}
                  defaultValue={String(company[key] || "")}
                  required={key === "name"}
                  maxLength={
                    key === "hr_phone"
                      ? 40
                      : key === "short_name"
                        ? 50
                        : key === "industry"
                          ? 100
                          : 200
                  }
                />
              </label>
            ))}
          </div>
          <input type="hidden" name="active_present" value="true" />
          <label className="po-checkbox">
            <input
              type="checkbox"
              name="active"
              defaultChecked={newRecord || company.active === true}
            />
            Active recruiting company
          </label>
        </ChangeForm>
      </section>
      {!newRecord && (
        <DeleteRecord
          kind="company"
          record={company}
          back="/placement/companies"
        />
      )}
    </>
  );
}
