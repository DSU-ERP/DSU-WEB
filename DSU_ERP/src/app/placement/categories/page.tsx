import { officerSession, placementCategories } from "@/features/placement/lib/server";
import { cohortQuery } from "@/features/placement/lib/intelligence";
import {
  CategoryCards,
  CategorySummary,
  CohortFilters,
} from "@/features/placement/components/CategoryDirectory";
import { Refresh } from "@/features/placement/components/Controls";

export default async function StudentCategories({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await officerSession();
  const query = cohortQuery(await searchParams);
  const data = await placementCategories(query);
  // Links and exports carry the batch the backend resolved, so every view of
  // a card shows the same cohort.
  const cohort = { batch: query.batch ?? data.batch ?? undefined, department: query.department };
  return (
    <>
      <p className="erp-eyebrow">DSU / PLACEMENT OFFICER</p>
      <div className="po-heading">
        <div>
          <h1>Student categories</h1>
          <p className="erp-muted">
            Passing-out batch {data.batch ?? "not set"}
            {query.department ? ` · ${query.department === "__missing__" ? "Department not recorded" : query.department}` : ""} · Official CGPA from the ERP
          </p>
        </div>
        <div className="po-actions">
          <Refresh />
        </div>
      </div>
      <CohortFilters
        action="/placement/categories"
        batches={data.batches ?? []}
        departments={data.departments ?? []}
        query={{ ...query, batch: query.batch ?? data.batch ?? undefined }}
      />
      <CategorySummary data={data} />
      {data.cards?.length ? (
        <CategoryCards cards={data.cards} cohort={cohort} />
      ) : (
        <p className="erp-empty">No category data is recorded for this selection.</p>
      )}
    </>
  );
}
