# Placement navigation and department chart refinement

Implemented 26 October 2026, on top of the existing Placement Overview work.

## Changes in this follow-up

- `src/features/placement/components/Workspace.tsx`: F.R.I.D.A.Y. first; accessible, collapsible Offers & Placements and Department Intelligence groups; route-aware expansion, including nested categories; compact header controls and account area. Existing link destinations, role gating, theme preferences, sidebar resizing, mobile dialog and sign-out action retained.
- `src/features/placement/components/DepartmentBarChart.tsx`: interactive client-side presentation of the existing department aggregates. A single cleaned snapshot supplies bars, count labels, tooltips and the data table. No data fetching or authorization logic added.
- `src/features/placement/components/Charts.tsx`: keeps the existing BarChart export, now backed by DepartmentBarChart. Other chart exports retained.
- `src/app/placement/overview.css`: officer-only navigation styling, hidden native scrollbar, header/account refinements and scoped department chart tokens/responsive behavior.
- `scripts/verify-overview-ui.cjs`: expanded route, grouping, accessibility, theme, touch, motion and chart-update browser checks.
- `scripts/verify-placement-ui.cjs`: existing regression assertions account for intentionally hidden child links and the interactive chart's group semantics.

These changes do not remove any functional module. Other pending files in the working tree belong to the preceding overview implementation.

## Navigation and preserved destinations

Parents only expand/collapse. Their children are real links. There are no duplicate destinations within a navigation instance. Desktop navigation and the mobile dialog provide the same destinations.

| Position/group | Destination | Existing URL |
| --- | --- | --- |
| First | F.R.I.D.A.Y. | `/placement/assistants/friday` |
| Top level | Placement overview | `/placement/overview` |
| Top level | Company management | `/placement/companies` |
| Top level | Placement drives | `/placement/drives` |
| Offers & Placements | Offers & placed students | `/placement/offers` |
| Offers & Placements | Multiple-offer tracking | `/placement/multiple-offers` |
| Department Intelligence | Department Intelligence Overview | `/placement/departments` |
| Department Intelligence | Batch analytics | `/placement/batch` |
| Department Intelligence | Student categories | `/placement/categories` |
| Department Intelligence | Student analytics | `/placement/student-analytics` |
| Top level | Company reports | `/placement/company-reports` |
| Top level | Master test results | `/placement/tests` |
| Top level | Data imports | `/placement/imports` |
| Top level | Student tools | `/placement/student-tools` |
| Existing testing-only condition | Talent intelligence | `/placement/talent-intelligence` |

Existing detail routes, filters and query strings are unchanged. A directly visited child reveals its group, including on refresh. Users may subsequently collapse it manually. Hidden children are not keyboard-focusable. Collapsed desktop mode keeps labeled icon links and working group toggles. Mobile uses the existing native modal dialog with Escape dismissal and focus return.

Only sidebar navigation scrollbars are hidden (`scrollbar-width: none`, `-ms-overflow-style: none`, WebKit scrollbar rule). Native vertical overflow remains enabled with overscroll containment. The account area is outside the scrolling navigation. Main-content scrolling is unchanged. No new application footer was invented.

## Chart design and interaction

| Metric | Light | Dark |
| --- | --- | --- |
| Total | `#62778A` | `#9BB0C5` |
| Eligible | `#C18A3E` | `#E0B16B` |
| Placed | `#287B61` | `#67BFA0` |

Department bars and legend swatches use solid fills. T/E/P labels, stable order, accessible names, counts and the data table distinguish metrics without color alone. Other charts retain their existing identities.

Hover, keyboard focus or tap selects a metric. A reserved readout above the plot shows full department name, metric, actual count and percentage of that department's total. It does not cover bar labels. Escape dismisses the tooltip. The readout remains available while moving the pointer onto it. Changes in the input data update the selected values without stale results.

Bars start at zero and use a shared linear count scale. Zero values have zero width, with their labels and accessible controls retained. All-zero placement data has an explicit note. Large differences between departments are not normalized or visually inflated; direct count labels retain legibility. The optional percentage view was not necessary and was not added.

Motion: 420ms initial reveal, 320ms width updates, 150ms emphasis, 160ms group reveal/chevron. Reduced-motion disables these. On narrow phones, full department names appear above each bar group. The original counting explanation and expandable data table remain available.

## Verification

- `npm run typecheck`: passed.
- `npm run test:overview-ui`: passed, light/dark at 1600, 1440, 1280, 1024, 768 and 390px. Checks all 14 normal routes, optional fifteenth testing route, nested active routes, compact groups, hidden-link accessibility, wheel and keyboard scrolling, tooltip hover/focus/Escape/tap, actual colors, zero widths, live data updates, reduced motion, filters and responsive overflow. No browser errors.
- `npm run test:placement-ui`: passed. Existing reports, batch drill-down, form serialization, assistant request/email draft, category ranking, overview and profile sharing fixtures continue to work at desktop/mobile sizes.
- `npm test`: 161/162 passed. The existing unrelated skills wording assertion still expects “every required platform”; production now says “GitHub, LeetCode, and LinkedIn are linked.” No unrelated behavior or assertion was changed to hide this failure.
- `npm run build`: compilation, TypeScript and route generation succeeded, but the command exited 1 with the installed Next.js version's `SecurityFatalError`. The version should be upgraded separately. Dependencies were not changed as part of this navigation task.
- No lint script is configured.
- `git diff --check`: passed.

Browser tests render real components and navigation with synthetic local fixtures and mocked server actions. Direct visits verify link destinations and active-group behavior in that shell; they are not live authenticated end-to-end tests. The build retains dynamic report routes and existing detail routes. Actual Supabase-backed page loads and sign-out requests were not executed against a live account.

Screenshots are under `.qa/overview-ui/`, including `overview-light-1440-viewport.png`, `overview-dark-390-viewport.png`, `department-mobile.png`, `department-tooltip-desktop.png`, and `navigation-mobile-expanded.png`. All screenshot numbers are synthetic test data.

## Boundaries

No Supabase records, schemas, environments, backend services, model settings or chat history were changed in this follow-up. No Render changes or deployment. No commit or push.
