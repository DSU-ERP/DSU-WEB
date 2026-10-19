# Placement workspace consolidation

The landing page provides Student and Placement Officer sign-in destinations.
The separate legacy `/portal` pages and their UI components are retired.
Old URLs redirect to `/placement`; student, batch and import links use their
corresponding placement destinations. Shared workspace CSS is in
`src/app/workspace.css`. Existing student data and database reports are retained.

Data imports is available at `/placement/imports`. The page and server action
require an active Placement Officer assignment. Recent import history is read
through the authenticated backend `/api/v1/imports` endpoint.
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

Friday conversation renaming uses the authenticated backend, retains officer ownership checks, and survives the legacy RPC cutover. Components live under `src/features/assistant` and `src/features/placement`; shared authorization and backend requests live under `src/shared`.

Integrated fetched revisions: backend `8867a8c` from `origin/main`; web `d748ab9` from `origin/testing`. Student work and these fetched changes are combined on local `codex/student-workspace` branches. Pre-integration stash snapshots remain available in both repositories.
