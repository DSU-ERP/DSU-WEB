# DSU platform integration — 13 October 2026

## Inspected architecture

The supplied `DSU-API` and `DSU-Backend` directories were empty Git repositories with no commits, framework, routes, auth, database layer or business logic to preserve. `DSU-WEB/DSU_ERP` was the existing Next.js landing page, including its assembled college/portal scroll transition and architecture tests. The pre-existing user changes upgrading Next and Sharp were preserved. The separate legacy `Desktop/Website/DSU_ERP/erpjarvis` career application was examined only for its CSV headers and schema reference; none of its working Clerk/career functionality was removed or modified.

## Final data flow

```text
Browser (HttpOnly session cookies)
  → DSU-WEB Next.js pages / Server Actions
  → DSU-Backend gateway (user token)
  → DSU-API (user token + backend service credential)
  → Supabase PostgreSQL (restricted dsu_api login + per-request RLS context)

Supabase Auth verifies user sessions.
Authorized local operator or admin portal → CSV validator → transactional importer.
```

WEB, Backend and API are independently deployable. Frontend remains a Next.js server application because it owns HttpOnly authentication sessions; static export hosting is insufficient. No circular service dependencies. No database credentials or service tokens are sent to the browser.

## Implemented surfaces

- Existing landing page and animation retained; SIGN IN and LOG IN now open `/login`.
- Supabase email/password login, session refresh via Next proxy, sign out, and protected portal routes.
- Admin/staff overview with real student and department totals, searchable/paginated directory, detailed records.
- Students are redirected to their assigned record; arbitrary IDs remain restricted by PostgreSQL RLS.
- Staff responses omit family/contact and financial fields. Admins and linked students can see their permitted details.
- Admin CSV upload with validation, file/row limits, import summaries and recent import history.
- Loading, empty, unavailable-service, validation-error and unlinked-account states; mobile sidebar/navigation, flexible metrics, labelled controls, and horizontally scrollable table regions.

## Supabase and actual import

The supplied project is connected through its session pooler with full CA/hostname verification using the user-provided certificate. The initially supplied direct IPv6 hostname was not reachable here. Created `erp.students`, `academics`, `contacts`, `memberships`, `import_runs`, `audit_events`, and migration bookkeeping. Enrollment IDs are unique strings. Foreign keys connect records; RLS and revoked anon/authenticated grants protect the isolated schema. Legacy public tables were absent in this project and were not created or overwritten.

| Source | CSV rows | Imported | Rejected | Second import unchanged |
|---|---:|---:|---:|---:|
| 2026_Batch.csv | 1,405 | 1,271 | 134 | 1,271 |
| 2027_Batch.csv | 1,895 | 1,707 | 188 | 1,707 |
| 2028_Batch.csv | 2,140 | 2,104 | 36 | 2,104 |
| Total | 5,440 | 5,082 | 358 | 5,082 |

Rejections: 349 missing/invalid enrollment IDs, 7 later conflicting duplicates, and 2 missing/invalid names on otherwise identifiable rows. Earlier valid rows for conflicting enrollment IDs were retained; the data owner must reconcile them. No student values were fabricated. Six negative outstanding fee balances were preserved. Batch metadata is taken from source filenames. Re-import added zero records and changed zero records. Full reason counts and the first 100 row diagnostics/file are in API's ignored `.local/import-first.jsonl` and `.local/import-repeat.jsonl`; no names or contact values appear in these reports.

## Run locally

Use three terminals, Node 24, and the already-configured ignored environment files:

```powershell
cd "C:\Users\shrey\.github\DSU-API"
npm ci
npm run dev
```

```powershell
cd "C:\Users\shrey\.github\DSU-Backend"
npm ci
npm run dev
```

```powershell
cd "C:\Users\shrey\.github\DSU-WEB\DSU_ERP"
npm ci
npm run dev -- --webpack
```

WEB is port 3000, gateway 4000, API 4001. Use `npm run build` then `npm start` for the production WEB server. Avoid starting a second server on an occupied port. No need to reinstall dependencies on every launch.

## First administrator — required

No real Auth account was provided or created. In Supabase Authentication → Users, create your intended administrator account and copy its UUID. Then, from DSU-API:

```powershell
npm run access:grant -- USER_UUID admin
```

Sign in at `/login` with that account. To link a student, create the Auth user and run `npm run access:grant -- USER_UUID student ENROLLMENT_NUMBER`. Use `staff` for a staff role. The command verifies references and prevents duplicate student links. It does not infer identity from CSV email addresses, grant roles from user metadata, or expose browser role-management endpoints. Review/disable Supabase public signups and configure password policy, MFA requirements and recovery/SMTP before release.

## Deployment steps

1. Review and commit source and lockfiles in each repository. Git ignores `.env`, local reports, and CSVs. No commits, pushes, or hosting deployments were performed by this task.
2. Migrations have been applied to the supplied project. On another project, supply operator-only `DATABASE_ADMIN_URL` and CA, then run `npm run db:migrate`, followed by `npm run db:provision`. The provisioning command saves a random restricted `DATABASE_URL` to local `.env`; re-running rotates that login and requires updating deployment secrets.
3. Connect DSU-API to Render. Its `render.yaml` defines build `npm ci --omit=dev`, start `npm start`, and `/health/ready`. Set runtime `DATABASE_URL`, Supabase URL/publishable key, shared `SERVICE_TOKEN`, exact allowed origin(s), and `TRUST_PROXY=1` only behind Render's single trusted proxy. Upload the database CA as a Render secret file named `prod-ca-2021.crt`. **Do not set DATABASE_ADMIN_URL in Render.** The app uses Render's assigned PORT.
4. Deploy DSU-Backend independently using its Dockerfile/Render blueprint or Node host. Set `DSU_API_URL=https://YOUR_API_HOST`, the same `SERVICE_TOKEN`, and exact frontend `CORS_ORIGINS`. Its readiness check depends on API readiness. No database password goes into Backend.
5. Deploy DSU-WEB from root directory `DSU_ERP` on a Next.js-compatible host. Install `npm ci`, build `npm run build`, start `npm start`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `DSU_BACKEND_URL=https://YOUR_BACKEND_HOST`. Public Supabase keys are intended for client distribution; privileged keys are not.
6. Configure the exact production site/auth redirect URLs in Supabase. Use HTTPS across public services. Add the first administrator, verify staff/student accounts, test sign-in/refresh/sign-out and the admin import screen against deployed URLs.
7. Configure alerts for non-200 readiness, 5xx/auth failures and failed imports. Test database backup restoration and approve retention/deletion schedules. Rotate the owner password shared during setup before production and update the local operator URL; the API uses its separately generated runtime password.

Environment templates live in each repository. Render plans/domains and hosting accounts were not provided, so no hosted URLs or successful deployment are claimed. CLI `supabase login/link` was unnecessary: migrations and import used the supplied PostgreSQL credentials directly; no Supabase access token was supplied.

## Executed verification

- Live Supabase PostgreSQL connection with verified TLS: passed.
- SQL migrations and restricted runtime login: applied successfully.
- Real CSV import and complete re-import: passed with the counts above. One initial overlapping verification/import attempt timed out and rolled back its file; the subsequent sequential full re-import completed successfully.
- Live transactional SQL checks: insert, unchanged import, changed record update, student row isolation, staff contact restriction, unlinked account denial, admin access, anonymous denial, and blocked role escalation passed. Synthetic Auth/student records were rolled back; no test account remains.
- API unit/injection suite: 13 passed. Backend gateway suite: 3 passed. Existing WEB architecture suite: 13 passed.
- WEB production build and TypeScript: passed on Next 16.4.0.
- Running HTTP checks: API readiness 200; gateway readiness 200; anonymous directory 401; landing/login 200; anonymous portal redirects 307 to login with no-store headers.
- Supabase Auth endpoint rejects an invalid token with 401.
- Dependency audits: zero known vulnerabilities reported for all three projects at check time.
- Ignored environment files verified in Git. No credential-containing files staged or committed.

Not yet verified: an actual administrator/student browser session (no real Auth account), full authenticated UI end-to-end flow, visual responsive checks in a browser (browser-control tooling unavailable this turn), deployed HTTPS/CORS/session behavior, Docker build, backups/restore, or load testing. Responsive CSS and auth UI compile, but that is not a substitute for these checks. The platform is an implemented and locally validated integration baseline; these are release gates before calling it production-ready.

## Privacy and organizational review

This implementation does not establish legal compliance by itself. Review the enacted DPDP Act, rules and phased commencement dates with the institution's legal/privacy owner using the official [MeitY rules and enforcement notices](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digit).

The institution must confirm the processing purpose and lawful grounds/consent for academic, financial and family data; notices and language/accessibility; data accuracy and source-owner correction; account-linking identity checks; retention/erasure including logs and backups; grievance/access/correction requests; incident notification procedures; processor contracts and hosting-region/transfer decisions; and access review/MFA. CSVs lack age data, so do not assume all students are adults—review applicable child-data requirements. Family contacts are other individuals' personal data and also need purpose/necessity review. Only approved staff should access/import the exports. Audit retention is a policy decision; no automatic deletion schedule was invented.

Technical controls here include explicit identity links, least-privilege database login, API authorization plus RLS, private-schema denial to browser keys, minimised directory fields, server-only credentials, parameterized queries, verified TLS, redacted logs, import atomicity/idempotence, and request/rate limits. Multi-instance rate limiting needs shared storage before scale-out; current limits are instance-local. Operators should monitor long imports and use the CLI for files that exceed web timeouts.

## Troubleshooting

- `ENOTFOUND` on direct database address: use the exact Supabase Session pooler URL.
- `SELF_SIGNED_CERT_IN_CHAIN`: configure the dashboard-downloaded database CA; never disable verification.
- API startup fails: ensure DATABASE_URL is the restricted dsu_api role, migrations are applied, and credentials/CA are present.
- Gateway 503: check API readiness, upstream URL, network routing and matching SERVICE_TOKEN.
- Signed in but access pending: assign the existing Auth user's UUID using `access:grant`.
- Import rejects rows: correct original export identities and review conflicting duplicate rows; re-run safely.
- Render import times out: inspect recent import history before retrying; prefer the authorized local CLI for large files.
- Next moved-folder/Turbopack errors: stop the old process, open the current directory, and run `npm run dev -- --webpack`.

## Changed/new files

API: package/lockfiles, ignore files, `src/{app,server,db,csv,importer}.js`, `scripts/{db-check,migrate,provision,grant-access,import-csv,verify-database}.js`, two SQL migrations, three test files, Dockerfile, Render YAML, CI, environment template and README.

Backend: package/lockfiles, ignore files, `src/{app,server}.js`, gateway tests, Dockerfile, Render YAML, CI, environment template and README.

WEB: package/lockfiles (Supabase dependencies added while preserving existing version changes), Next configuration, login pages/actions, portal layout/pages/import form/loading/error/CSS, Supabase server helper, authenticated API client, proxy, existing landing portal links, environment template, CI, and this integration guide. Ignored local environment files were configured separately.
