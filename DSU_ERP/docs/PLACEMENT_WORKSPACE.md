# Placement workspace consolidation

The landing page has one sign-in destination: the existing Placement Officer
workspace. The separate `/portal` pages and their UI components are retired.
Old URLs redirect to `/placement`; student, batch and import links use their
corresponding placement destinations. Shared workspace CSS is in
`src/app/workspace.css`. Existing student data and database reports are retained.

Data imports is available at `/placement/imports`. The page and server action
require an active Placement Officer assignment. Recent import history is read
directly from Supabase through the authenticated `dsu_placement_imports` RPC.
CSV uploads still use the consolidated backend at `DSU_BACKEND_URL`, with the
officer's user token, CSV validation, transaction rollback and audit logging.

Deployment requires the backend migration
`202610150001_placement_imports.sql` and the updated backend import handler.
Apply the migration with `npm run db:migrate` in DSU-Backend before deploying
the backend and web changes. This does not grant officer access to new users.
Accounts must already be active in `placement.officers`. Existing API admin
import permission is retained; ordinary staff/student accounts gain no access.

F.R.I.D.A.Y. is instructed to render record details as one labeled field per
bullet line, including voice requests. The renderer preserves explicit line
breaks. Previously saved prose answers are not rewritten or re-queried.
