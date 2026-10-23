import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import {
  officerSession,
  placementCategories,
  placementRankedStudents,
} from "@/features/placement/lib/server";
import {
  directoryQuery,
  isCategory,
  rankedExportHref,
} from "@/features/placement/lib/intelligence";
import {
  CohortFilters,
  RankedDirectory,
} from "@/features/placement/components/CategoryDirectory";

export default async function RankedCategory({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await officerSession();
  const { category } = await params;
  if (!isCategory(category)) notFound();
  const query = directoryQuery(await searchParams);
  const [cards, data] = await Promise.all([
    placementCategories({ batch: query.batch, department: query.department }),
    placementRankedStudents(category, query),
  ]);
  const card = cards.cards?.find((c) => c.id === category);
  const batch = query.batch ?? data.scope?.batch ?? cards.batch ?? undefined;
  const name = card?.name ?? category;
  return (
    <>
      <Link
        href={`/placement/categories${batch || query.department ? `?${new URLSearchParams(Object.entries({ batch, department: query.department }).filter((e): e is [string, string] => !!e[1]))}` : ""}`}
        className="erp-back"
      >
        ← Student categories
      </Link>
      <p className="erp-eyebrow">DSU / PLACEMENT OFFICER</p>
      <div className="po-heading">
        <div>
          <h1>{name} students</h1>
          <p className="erp-muted">
            {card ? `CGPA ${card.range} · ` : ""}Passing-out batch {batch ?? "not set"}
            {query.department ? ` · ${query.department === "__missing__" ? "Department not recorded" : query.department}` : ""}
          </p>
        </div>
        <div className="po-actions">
          <a
            className="erp-secondary"
            href={rankedExportHref(category, { ...query, batch })}
            download
          >
            <Download size={14} aria-hidden="true" /> Export CSV
          </a>
        </div>
      </div>
      <CohortFilters
        action={`/placement/categories/${category}`}
        batches={cards.batches ?? []}
        departments={cards.departments ?? []}
        query={{ ...query, batch }}
        extra
      />
      <RankedDirectory data={data} query={{ ...query, batch }} category={category} />
    </>
  );
}
