# Placement Overview redesign

Implemented for `/placement/overview`. No deployment, push, credential change or remote database migration was performed. Student, offer and drive records were not changed.

## Design direction

The Placement Officer's first task is to understand the selected student cohort, then identify recruitment activity requiring attention. The overview now follows that sequence.

- Base palette: page `#fafaf8`, surface `#ffffff`, text `#1b211b`, secondary `#626a61`, institutional red `#b6222b`, success `#2c775d`. Existing theme tokens supply dark surfaces; chart colors have separate dark variants.
- Typography: existing Geist and Geist Mono. A 38px desktop title, 34px primary figures, smaller operational values and tabular numerals establish priority without a second font system.
- Layout: left-aligned information, consistent 18px gaps, 20px card padding, 10px card corners, no decorative shadows or counters.
- Compared with the old repeated card grids, the operational metrics use a subordinate strip. The chart grid uses 5/7 proportions. Empty recruitment modules use factual, compact messages rather than large placeholder panels.

```text
Grouped sidebar | Title + environment + Refresh
                | Search / batch / branch / Apply / Clear
                | Students | Eligible | Placed | Placement rate
                | Offers   | Companies | Drives | Average CGPA
                | Placement status (5) | Departments (7)
                | Upcoming and ongoing drives
                | Recent placements | Recruiting companies
                | Stages | Package categories | Compensation
                | Outcomes, department detail, progress, definitions
```

## Implementation and files

Paths below are relative to the web repository's `DSU_ERP` directory.

| Files | Change |
| --- | --- |
| `src/features/placement/components/Overview.tsx` | New dashboard composition, primary/secondary KPIs, activity, supporting measures, partial failure and empty states. |
| `src/features/placement/components/OverviewFilters.tsx` | One filter state in the URL; accessible controls, pending submission and clearing. |
| `src/features/placement/lib/overview.ts` | Campus-date comparison for past-dated active drive warnings. |
| `src/app/placement/overview/page.tsx`, `loading.tsx` | Explicit route and dashboard-shaped loading state; reuses the existing authenticated loader. |
| `src/app/placement/[section]/page.tsx` | Overview dispatch, shared search scope, environment label and server-provided campus date. Other report paths retain their existing rendering. |
| `src/app/placement/overview.css`, `layout.tsx` | Scoped overview styling and shared navigation refinements. |
| `src/features/placement/components/Workspace.tsx` | Grouped navigation, compact spacing, preserved desktop collapse/resize, native mobile dialog with Escape and focus return. |
| `src/features/placement/components/Charts.tsx` | Reuses donut, bars and progress; removes obsolete KPI wrapper, adds a scaled bar axis, honest zero rendering and keyboard-accessible data-table disclosures. |
| `src/features/placement/components/Reports.tsx` | Removes the duplicate overview report composition. |
| `src/features/placement/components/Controls.tsx` | Refresh pending state, retaining the current URL and filters. |
| `src/features/placement/lib/server.ts` | Allows student search in the chart request. |
| `scripts/verify-overview-ui.cjs`, `scripts/verify-placement-ui.cjs` | New targeted browser coverage and updated existing overview fixtures. |
| `tests/placement-overview.test.ts`, `scripts/test.mjs`, `package.json` | Date-warning coverage and test commands. |

Backend changes, relative to `C:/Users/shrey/.github/DSU-Backend`:

- `src/modules/intelligence/profile-routes.js`: validates optional student search on the chart endpoint.
- `supabase/migrations/202610260001_overview_search.sql`: narrowly scoped function update for the verified search defect. Preserves aggregation, function ownership and grants; alters no tables or records.
- `test/placement-overview.integration.test.js`: independent local database coverage for the complete overview contract.

Reused primitives include the existing Table, offer columns, authenticated read services, Refresh, chart helpers and theme tokens. No new packages were installed. F.R.I.D.A.Y. and student-facing features were not rewritten.

## Information and interaction changes

- Four primary KPIs appear once: selected students, eligible, distinct placed and placement rate.
- Active offers, participating companies, active drives and average valid CGPA form the secondary row.
- Accepted offers, unplaced students and eligible placement rate remain available in a compact outcomes strip.
- Compensation has its own section. Missing compensation is not represented as zero salary.
- Recruitment activity precedes lower-priority breakdowns. Existing offer, company, student and drive navigation remains available.
- Department compensation details are accessible in a disclosure. No data is removed to achieve a shorter layout.
- Chart legends include text and values, zero slices are omitted, zero bars have no minimum visible width, and all charts offer readable data tables.
- Past-dated upcoming/ongoing drives show a review warning without changing stored status.
- Empty cohorts, genuine zero measures, unavailable analytics and empty offer records have distinct states.
- Search/batch/branch values are retained in the URL. Refresh preserves those values. Forms show pending feedback and prevent repeated submission.
- The mobile menu uses the native modal dialog's focus management and Escape behavior. Desktop resizing and saved preferences remain intact.
- All 14 standard navigation destinations are retained; the existing test-only Talent intelligence destination remains gated.

## Data audit and preserved definitions

Read-only configuration inspection found:

- Normal web `.env.local` and backend `.env` target `idioblehzhaibtgotfjk`, the main DSU project.
- Dedicated competency-testing files target `bsiibnoqfuyxieogions`, the isolated testing project.
- This redesign does not switch runtime environments. The gated testing runtime explicitly labels synthetic data; local normal runtime shows a configured-campus-data label.

A transaction explicitly opened as `READ ONLY` against the configured main database returned 5,082 students, zero recorded offers, zero active offers, zero distinct placed students, two company records, one drive and one past-dated drive still marked active. Company records are different from participating companies: participation is defined by having a drive in the selected batch.

The SQL audit confirms that placed students are distinct student identities with offered or accepted offers. Declined and revoked offers do not count. Eligibility remains valid CGPA >= 6.75 with no added backlog condition. Four status segments partition the cohort. Mean CGPA excludes invalid records. Package statistics are calculated over active offers, which may include multiple offers per student.

Companies and recruitment schedules intentionally follow the batch, not student search or branch. This existing business definition is now visible beside the measures. Student and offer data follow all three filters.

### Required database follow-up for search

Previously the report accepted student search while the chart endpoint accepted only batch and department, silently displaying a different cohort. The new migration is justified by that functional defect. It extends the existing function's validated filters and response metadata; it does not recalculate or rewrite stored records.

The migration has passed against disposable local databases. It has **not** been applied to either Supabase project. Backend code and this migration must be released together for student-search charts to work against a remote database. With an older backend/function, a search request produces the explicit partial-analytics error rather than silently showing unfiltered figures. Ordinary batch/branch queries retain their existing contract.

## Verification

- TypeScript check: passed after the final component changes.
- `npm run test:overview-ui`: passed with real components and synthetic local fixtures at 1600, 1440, 1280, 1024, 768 and 390px, in both themes. Covers filters, clear, refresh, counts, zero/missing/empty states, date warnings, desktop collapse, mobile focus return, readable chart data and populated tables. No browser errors or horizontal page overflow.
- `npm run test:placement-ui`: passed after updating fixtures for the new overview composition; checks the shared navigation and existing placement flows.
- Focused web unit tests: 14 passed, including date warning, cohort filtering, formatting, analytics and existing placement helpers.
- Full web unit suite: 161 of 162 passed. The remaining unrelated test still expects an older skills-onboarding description (`every required platform`) instead of the current GitHub/LeetCode/LinkedIn wording.
- Focused backend overview and placement-portal tests: 3 passed. Covers duplicate offers counting once, active versus declined offers, status reconciliation, department mapping, name/USN search, report/chart agreement, empty denominator, input bounds and officer authorization.
- Broader existing backend intelligence/profile suites have unrelated skills/onboarding fixture failures and duplicate platform-account setup errors; they are not reported as passing. The existing overview aggregation subtest itself passed.
- Build compiled successfully, completed TypeScript and generated routes, including `/placement/overview`. Both the initial build and the final retry exited at Next.js 16.4.0's security-version gate. The production build is therefore not reported as passing; the installed Next.js version needs a security update before release.
- No lint script is configured in this repository.
- `git diff --check`: passed in both repositories.

Browser checks use isolated synthetic fixtures and mocked server boundaries, not a real officer sign-in. Live validation was limited to read-only configuration and aggregate-data checks. There was no remote data write, migration, push or Render change.

## Screenshots

Screenshots are local QA artifacts (ignored by Git), clearly labelled as synthetic fixtures:

- `.qa/overview-ui/overview-light-1440-viewport.png`
- `.qa/overview-ui/overview-dark-390-viewport.png`
- `.qa/overview-ui/overview-light-1440.png` (full page)
- `.qa/overview-ui/overview-dark-1440.png` (full page)
- `.qa/overview-ui/overview-populated-mobile.png`
- `.qa/overview-ui/overview-partial-failure.png`

Remaining work before release: apply the reviewed search migration to the intended database through the normal release process, address the existing dependency security warning, and repair the unrelated legacy skills-test expectations/fixtures. No production changes were made as part of this task.
