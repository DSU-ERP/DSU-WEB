import test from "node:test";
import assert from "node:assert/strict";
import {
  analyticsFilters,
  filterQuery,
  selectedPage,
  formatCgpa,
} from "../src/lib/analytics/filters";

test("batch, department and name/USN filters survive category and pagination links", () => {
  const filters = analyticsFilters({
    batch: "2026",
    department: "CSE & AI",
    search: "O'Brien / USN",
    page: "2",
  });
  const query = filterQuery(filters);
  assert.equal(query.get("batch"), "2026");
  assert.equal(query.get("department"), "CSE & AI");
  assert.equal(query.get("search"), "O'Brien / USN");
  assert.equal(query.has("page"), false);
  query.set("page", "3");
  assert.deepEqual(analyticsFilters(Object.fromEntries(query)), filters);
});
test("invalid filters and non-integer pages are bounded before API calls", () => {
  assert.deepEqual(
    analyticsFilters({
      batch: "not-a-year",
      department: ["one", "two"],
      search: " ",
    }),
    {},
  );
  assert.equal(
    analyticsFilters({ search: "x".repeat(200) }).search?.length,
    100,
  );
  for (const value of [undefined, "0", "-1", "1.5", "NaN"])
    assert.equal(selectedPage(value), 1);
  assert.equal(selectedPage("99999999"), 100000);
});
test("display formatting keeps missing separate from zero and does not classify rounded values", () => {
  assert.equal(formatCgpa(null), "—");
  assert.equal(formatCgpa("0"), "0.00");
  assert.equal(formatCgpa("8.499"), "8.50");
});
