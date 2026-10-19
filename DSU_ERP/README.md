# DSU Web

Next.js 16 / React 19 app for DSU campus, student preparation and placement officers. Node 24. Hosting is a separate Render web service; all campus/student/placement data passes through DSU-Backend. Supabase provides authentication.

## Structure

- `src/app/`: routes, layouts, same-origin handlers and route-specific styles.
- `src/features/student/`: student UI, contracts, speech/media and data helpers.
- `src/features/placement/`: officer reports, drive controls and StudentTools.
- `src/features/assistant/`: officer assistant/Friday UI and orchestration.
- `src/features/campus/`: campus analytics and report contracts.
- `src/shared/auth/`: cookies and request-scoped session helpers.
- `src/shared/http/`: authenticated backend transport and safe errors.
- `src/shared/config/`: environment validation.
- `src/components/`: landing/animation and presentation assets.
- `scripts/`, `tests/`: setup, unit and browser checks.

Run `npm ci`, `npm run env:setup`, fill ignored `.env.local`, then `npm run env:check` and `npm run dev`. Backend defaults to localhost:4000. Existing local values are preserved. Public Supabase URL/key belong in NEXT_PUBLIC_*; database passwords and service-role keys never belong here.

Student entry: `/login?portal=student` or `/sign-up`, then `/student`. Officer entry: `/login?portal=placement-officer`, then `/placement`. Students require an operator-linked official record. Officer publishing is `/placement/student-tools`, also available in navigation.

[Feature tracker](docs/STUDENT-IMPLEMENTATION.md), [integration](INTEGRATION.md), and [verification](VALIDATION.md) explain the delivered system. Database migrations and architecture/runbook live in DSU-Backend/docs/.

## Checks

`npm test`, `npm run typecheck`, `npm run test:ui`, `npm run build`, `npm audit --audit-level=high`.

Browser checks use synthetic component fixtures and mocked transport. Backend integration separately exercises actual SQL rules using isolated PostgreSQL/PGlite. Fixtures never seed production. Real signup/account linking, deployed media, provider quality and Render concurrency require staging rehearsal.

Landing artwork and existing officer workspace remain. Student UI follows DSU's neutral/red theme with optional dark mode. Historical direct-Supabase data-access documentation is archived and is not the current contract.
