# Batch drill-down

Open **Batch Analytics** to see the original batch comparison. Click a batch
row to open its Advanced / Medium / Needs Improvement panels. Directly below
those panels is the department breakdown table, with totals, gender, admission
quotas, CGPA statistics, missing CGPA and average CGPA. Click a department row
to open its student list. **View all matching students** opens the selected batch.
The student list supports name/USN search, department, quota and CGPA category
filters, server-side pagination, and ascending/descending sorting by CGPA,
name, USN, SGPA, attendance, semester or backlogs. Column headings also sort.
Click a student row or its name to expand personal, academic, performance,
family and fee details. Click again to collapse; the URL preserves the filters
and page so Back/Forward navigation works.

The existing portal styling is retained. Wide tables scroll within their panel.
Every row action also has a keyboard-accessible link. Details are retrieved only
for the expanded student, not embedded for everyone in the list.

All records come directly from Supabase through `dsu_batch_read`. Apply API
migration `004_batch_drilldown.sql` before deploying this website update. No
student records are re-imported or modified. Existing CGPA category functions
remain the source of classification; numeric sorting precedes display rounding.
Actual quota values are displayed, without guessed group mappings.

Permissions remain enforced inside Supabase. Students cannot browse batches.
Staff see academic records but not contact, family, gender or fee information.
Administrators may export the filtered list (maximum 20,000 rows and five exports
per minute, shared with category exports). Unknown placement policy is displayed
as not configured. The CGPA ≥ 6.0 statistic is separate from placement eligibility
and the final three performance categories.

Validation: run `npm test` and `npm run build` here. In the API repository run
`node --env-file-if-exists=.env scripts/verify-batches.js`; it checks sorting,
filters, pagination, summary reconciliation, detail scoping, permissions and
export restrictions with synthetic data rolled back after testing. Before
installing migration 004, use `--preview` to roll back the migration as well.
