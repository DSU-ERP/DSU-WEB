# Portal data access

All portal reads now use Supabase directly through the signed-in user's session:

`Next.js server component → Supabase Data API → dsu_portal_read → erp tables`

This covers membership, overview, directory, student details, Batch Analytics,
Student Analytics, category lists, exports, and import history. Render is no
longer in the read path. Existing CSV uploads still use the authenticated import
service, which writes into those same Supabase tables.

## Configuration

The website needs `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. It does not need a database password,
service-role key, or Render URL to read records. `DSU_BACKEND_URL` is required
only when using the existing CSV upload feature.

Apply API repository migration `003_supabase_portal_reads.sql` before deploying
this website update. The migration adds functions and grants only; it does not
copy, replace, or re-import student data. The existing imported records already
reside in Supabase. Run `npm run db:migrate` in the API repository with its
existing administrator connection, or apply the reviewed SQL via Supabase.

## Permissions and precision

Only authenticated users can execute the RPC. It derives identity from JWT
claims verified by Supabase, checks membership, and uses the restricted database
role and existing row-level policies. Anonymous and unlinked accounts cannot
read records. Students see their own record only. Staff cannot access contacts,
fees, imports or exports. Administrators can export a maximum of 20,000 matching
students, five times per minute; exports are audited.

The private `erp` schema is not exposed for arbitrary browser queries. No
service-role secret is shipped to the browser. Filters and pagination are
validated in Supabase, and CGPAs are classified with PostgreSQL numeric
precision. CSV and ranked-list CGPAs are returned as text to preserve precision.

The SQL category definitions are generated from the API's shared
`src/lib/analytics/categoryRules.js`. Do not edit an applied migration when
changing rules; create a new migration. Run
`node scripts/generate-portal-migration.js --check` in the API repository to
check the initial migration matches those rules.

## Verification

In the API repository, `node --env-file-if-exists=.env scripts/verify-portal.js`
checks actual database permissions, exact category boundaries, cohort totals,
filters, pagination, exports and student isolation. Its synthetic records and
audit writes are rolled back. `--preview` also installs the new migration inside
the rollback transaction; use it only before installing migration 003.

In this website run `npm test` and `npm run build`.
