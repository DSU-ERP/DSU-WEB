# Integration and environments

Browser → Next.js → DSU-Backend /api/v1 → restricted PostgreSQL role. Supabase Auth establishes the session; backend independently verifies the bearer token. Product roles are student and placement officer, with protected operator grants for linking/campus administration.

The landing page offers Student and Placement Officer sign-in immediately. The selection is carried to `/workspace`, where the backend role is checked. It never assigns a role. Student account creation verifies email, then collects profile, education, interests/skills, career goals and final confirmation. Unique verified email matches autofill official fields. Unmatched or ambiguous submissions remain pending for campus verification; entering a USN alone does not grant access.

Configure `DSU_WEB_URL` as the canonical web origin (development: `http://127.0.0.1:3000`; production: the public HTTPS hostname). Render's `RENDER_EXTERNAL_URL` is the fallback. In Supabase Auth, enable email confirmation and allow the matching `/auth/confirm` redirect. The email confirmation template can use `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`; signup and resend set RedirectTo to the canonical `/auth/confirm`. The callback also supports PKCE code exchange. Confirm hostname/redirect settings and delivery on staging before rollout. Students supply optional public profile URLs; no GitHub personal access token is requested.

| Location | Contents |
|---|---|
| Web .env.local / Render web | Public Supabase URL/key, DSU_BACKEND_URL, persistent production NEXT_SERVER_ACTIONS_ENCRYPTION_KEY; optional officer provider/search/mail settings |
| Backend .env / Render backend | Restricted DATABASE_URL, TLS CA, Supabase verification, legacy SERVICE_TOKEN, Redis, stable ASSESSMENT_CODE_SECRET, optional student AI |
| Backend .env.operator | DATABASE_ADMIN_URL and operator TLS; never deployed |
| Checked-in *.example | Names, non-secret defaults and comments |

Student AI runs in backend. Existing officer Friday integrations run in web. Browser speech needs no server speech credentials. NEXT_PUBLIC_* values are public/build-time and require rebuilding when changed.

## Hosting

DSU-WEB/render.yaml deploys web from DSU_ERP on Node 24. DSU-Backend/render.yaml deploys backend plus shared Key Value limits. Configure real credentials and provider CA using Render secrets. Starter declarations are a starting point, not certified concurrency. Full migration/link/RPC-cutover sequence: DSU-Backend/docs/RENDER_SETUP.md. No new Render database is required.

Never put DATABASE_ADMIN_URL, DATABASE_URL or SUPABASE_SERVICE_ROLE_KEY in web: env validation rejects them. Same-origin handlers forward the user's token and disable caching. Media permissions are enabled only for relevant student interview/chat and officer Friday routes.

## Routes and access

Student modules: dashboard/readiness, Observation Haki chat, interview library/create/session/report, generated tests/runner/results, six-category practice, assigned tests, resume intake/report, placement, timetable and settings. Shared layout loads the linked official record; unlinked users receive an access state. Five-step setup stores personal goals separately from official academics. Officer StudentTools publishes assigned tests, cohort notices and events.

Application data no longer uses direct PostgREST. Compatibility RPC grants are revoked by the backend operator after both apps deploy. Before that cutover, RPC authorization remains but bypasses API request limits.

References: [Render Blueprint](https://render.com/docs/blueprint-spec), [Next self-hosting](https://nextjs.org/docs/app/guides/self-hosting).
