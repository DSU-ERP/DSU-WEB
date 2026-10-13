import test from "node:test";
import assert from "node:assert/strict";
import {
  batchFilters,
  batchQuery,
  batchCsv,
  type BatchView,
} from "../src/lib/analytics/batches";
test("batch drill-down preserves filters and resets expanded students when sorting", () => {
  const filters = batchFilters({
    batch: "2026",
    department: "CSE",
    quota: "DSAT ONLINE",
    category: "medium",
    search: "A&B",
    sort: "name",
    direction: "asc",
    student: "old",
    page: "7",
  });
  const q = batchQuery(filters, { sort: "cgpa", direction: "desc" });
  assert.equal(q.get("batch"), "2026");
  assert.equal(q.get("department"), "CSE");
  assert.equal(q.get("quota"), "DSAT ONLINE");
  assert.equal(q.get("search"), "A&B");
  assert.equal(q.get("student"), null);
  assert.equal(q.get("page"), null);
  assert.equal(batchQuery(filters, { page: "2" }).get("sort"), "name");
});
test("only supported sorting and category identifiers are sent to Supabase", () => {
  assert.equal(
    batchFilters({ sort: "constructor", direction: "DROP" }).sort,
    "cgpa",
  );
  assert.equal(batchFilters({ sort: "cgpa;drop table" }).sort, "cgpa");
  assert.equal(batchFilters({ category: "eligible" }).category, undefined);
  assert.equal(
    batchFilters({ category: "unclassified" }).category,
    "unclassified",
  );
});
test("batch CSV exports preserve exact values, zeroes, and escape spreadsheet formulas", () => {
  const data = {
    students: [
      {
        enrollment_no: "=BAD()",
        full_name: 'A "name"',
        cgpa: "8.49999999999999",
        sgpa: "0",
        current_backlog: 0,
        source_batch: "2026",
      },
    ],
  } as BatchView;
  const csv = batchCsv(data);
  assert.match(csv, /'=BAD\(\)/);
  assert.match(csv, /A ""name""/);
  assert.match(csv, /8\.49999999999999/);
  assert.match(csv, /"0"/);
  assert.match(csv, /Not configured/);
});
