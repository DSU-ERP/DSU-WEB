# Placement Officer workspace

Source: `PLACEMENT_OFFICER_FEATURES.md`, supplied by the user.

Confirmed overrides: baseline academic eligibility remains valid CGPA >= 6.75,
with no backlog condition. Each drive has independent CGPA, backlog and branch
requirements. Placement Officer access is explicitly assigned to erpdsu@gmail.com.
Existing campus administrator access is retained. No code is to be pushed.

## Scope and acceptance ledger

This ledger tracks the complete requested scope; an entry is complete only after
its data path, permissions, UI and relevant validation have been checked.

- [x] Protected officer sign-in, dedicated navigation, sidebar, theme, sign-out.
- [x] Placement overview: cohort, placement and offer counts, package statistics,
      department/category/company comparisons, recent offers and drive statuses.
- [x] Companies: create, search/filter, edit, activate/deactivate, counts and
      confirmed cascading deletion.
- [x] Drives: full editor, eligibility, dates, ordered rounds, filters/status,
      detail and confirmed cascading deletion.
- [x] Candidate pools, separate invitations/interest/registrations, upward-only
      category rule, individual/bulk registration and explicit interest override.
- [x] Sequential recruitment rounds, individual/bulk pass/fail, withdrawals,
      final selection and transactional offer creation.
- [x] Offers: status/category/department filters, decisions, active/history,
      placement status, company/department totals and CSV.
- [x] Company reports and multiple-offer history/statistics.
- [x] Department intelligence including percentiles, leaders and offer drill-down.
- [x] Student journey, academic profile, drives/rounds/offers and activity timeline.
- [x] Existing batch/category analytics reused in the officer workspace with
      scoped student detail, reports and CSV exports.
- [x] CGPA college/department ranks, eligibility filters and CSV.
- [x] Completed master test results, rankings, filters, security indicators,
      participation/violation summaries and pagination.
- [x] Points, GitHub and domain rankings with contribution breakdowns.
- [x] Talent matrix, existing predictions, readiness/risk/role/language reports,
      filters, sorting, missing-prediction coverage, pagination and CSV.
- [x] Observation Haki text chat, lookup, web search, confirmed email drafts,
      new chat and owned conversation history.
- [x] F.R.I.D.A.Y. text/voice, speech controls, real-data tools, proposals,
      session log and diagnostics.
- [x] Empty/error/loading states, keyboard/mobile access, no sample metrics,
      server authorization, input validation, audit/idempotency and tests/build.

Section 21 documents incomplete functionality in the reference application.
Do not manufacture sample progress, notifications, predictions or test approvals.
Completed behavior must be distinguished from any provider/data dependencies.

## Data and access design

Placement data resides in a private Supabase schema, separate from existing ERP
tables. The signed-in user's verified JWT is checked by restricted RPC functions.
An explicit officer roster grants access; choosing a login screen never grants
permissions. Existing admin/staff/student routes retain their current access.
Company/drive deletions require a matching typed confirmation in the UI and RPC.
Mutations use transactions, revision checks, idempotency keys and an audit trail.
Students, tests, predictions and scores must come from recorded data, never from
the reference screenshots or synthetic production seed rows.

## Validation and availability

- Installed Supabase migrations 006–010. The requested account has explicit officer access and retains its existing administrator membership.
- Verified live counts: 5,082 students overall; 2,104 in batch 2028. Department totals and CGPA categories reconcile, including unclassified records.
- Database tests use synthetic fixtures in a rolled-back transaction: authorization, CGPA boundaries, filters, latest test attempts, ranks, registration, sequential rounds, upward-only offers, history, idempotency, revisions, private conversations and single-use action confirmation.
- API unit suite: 43 passing tests. Web unit suite: 34 passing tests. Production build succeeds.
- Browser component checks cover report screens, desktop/mobile overflow, sidebar/theme, cohort drill-down, sorting, round editing, mutation payloads, selection restrictions and assistant drafts. Server mutations are mocked in these browser checks and validated separately in database tests.

## Running and publishing manually

From `C:\Users\shrey\.github\DSU-WEB\DSU_ERP`:

```powershell
npm install
npm run dev
```

Choose **SIGN IN · PLACEMENT OFFICER** on the landing page, or open
`/login?portal=placement-officer`. Use the existing account and password; no password
was created or changed. The workspace opens at `/placement/overview`.

For production use `npm run build`, followed by `npm start`. Tests are `npm test`
and `npm run test:placement-ui` (Windows uses installed Edge; elsewhere install
Playwright Chromium). No code was committed, pushed or deployed by this change.
Publish the WEB and API changes manually. The Supabase schema is already installed.

Placement reads and writes use the signed-in Supabase session directly. They do
not require the Render API or backend. Public web variables contain no database
password or service-role key.

## Provider and recorded-data dependencies

Assistants run guided campus tools without an external language model. They resolve
student searches, batch summaries, precise minimum-CGPA candidate lists, recent
drives, placement outcomes, test results and recorded career insights. They do not
invent answers or substitute academic data for another requested report. Conversations
are isolated to their owner. F.R.I.D.A.Y. voice depends on browser speech support and
microphone permission; typed requests work without it.

Optional server settings are listed in `.env.example`. `BRAVE_API_KEY` enables
embedded web results; without it, a working external search link is provided.
`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_EMAIL` and `SMTP_APP_PASSWORD` enable
email delivery. Drafting works without SMTP; sending remains disabled. Provider
availability was not verified, no real email was sent, and no paid service was enabled.

Each reviewed email proposal is claimed once in Supabase before delivery. Ambiguous
provider failures do not retry automatically; check sent mail before creating a new
draft. Drive creation and placement decisions use the validated management screens.

The existing source supplies student, academic and contact data. New company,
drive, offer, test, points and prediction tables start empty. These screens display
recorded data, not screenshot examples. Companies, drives and offers are managed
in the workspace. Existing assessment, points and prediction observations can be
loaded using the API operator import described in `PLACEMENT_DATA.md`. It validates
USNs and runs a dry run unless explicitly given `--apply`.

No bulk prediction generator, invented progress, exam creation/review approval or
sample notification feed was added. Section 21 explicitly documents those limitations.

## Relevant files

- Web routes: `src/app/placement`; components: `src/components/placement`; helpers: `src/lib/placement`.
- API migrations: `006_placement_workspace.sql` through `010_bulk_candidate_validation.sql`.
- Database checks: `node --env-file-if-exists=.env scripts/verify-placement-workspace.js`.
- Officer assignment: `scripts/grant-placement-officer.js`, using operator credentials.

Provider references: [Nodemailer SMTP](https://nodemailer.com/smtp) and
[Brave web search API](https://api-dashboard.search.brave.com/api-reference/web/search/get).

Database workflow checks: 107 passed. Production HTTP checks passed for protected pages, exports, assistant authentication, cross-origin rejection, voice headers and the officer login form.

Bulk verification registered 500 synthetic candidates in approximately three seconds,
then confirmed a repeated registration added zero duplicates. All fixtures rolled
back. The recorded-data importer also passed an empty-file dry run without saving.
