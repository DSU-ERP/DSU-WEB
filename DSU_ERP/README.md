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

AI Interview uses browser-local Whisper tiny.en for English voice-to-text,
with a worker and same-origin WASM/model assets. Audio is never sent to a
transcription API. `npm run dev` and `npm run build` prepare the pinned model
once; `npm run speech:setup` can prepare it explicitly. The initial setup needs
network access to download the Apache-2.0 model from
[Xenova/whisper-tiny.en](https://huggingface.co/Xenova/whisper-tiny.en).
Generated assets in `public/interview-speech/` are ignored by Git and must be
prepared on the build machine. Once prepared, runtime speech uses no external
model or speech-service requests. Four voice styles use installed offline
English voices; their sound depends on the device. Check the microphone and
voice preview before starting a timed session.

`npm test`, `npm run typecheck`, `npm run test:ui`, `npm run build`, `npm audit --audit-level=high`.

Browser checks use synthetic component fixtures and mocked transport. Backend integration separately exercises actual SQL rules using isolated PostgreSQL/PGlite. Fixtures never seed production. Real signup/account linking, deployed media, provider quality and Render concurrency require staging rehearsal.

Landing artwork and existing officer workspace remain. Student UI follows DSU's neutral/red theme with optional dark mode. Historical direct-Supabase data-access documentation is archived and is not the current contract.

### Dashboard UI and loading (20 October 2026)

The student dashboard uses a quiet application frame with neutral light/dark surfaces, a fixed sidebar, three preparation actions and one recommended next step. Compact progress, preparation, placement and upcoming-event sections replace repeated cards. The setup checklist expands on demand; the dashboard loading skeleton follows the final layout. Styles are scoped in `src/app/student/workspace-polish.css`, leaving the standalone Haki and interview studio layouts intact. The sidebar keeps its scrollbar hidden while retaining keyboard, wheel and touch scrolling.

Dashboard data is read in one SQL statement inside the existing authenticated actor transaction, replacing 12 sequential data queries. Student workspace access and profile reads run concurrently, with access errors/redirects taking precedence. A dashboard-specific loading skeleton provides feedback during navigation. Private results are not cached between users.

### Dedicated AI Interview workspace (21 October 2026)

`/student/interview` has its own responsive navigation, overview, interview library, sessions/reports and a back-to-dashboard action. Creation is one page with AI/manual questions, optional parsed resume/JD context, duration, tone, follow-ups and communication preferences. Both modes explain and require the browser security checks before consent. Text-only coached practice skips speech preparation, while camera and microphone access remain required for security. Media is not recorded or uploaded.

Submitting setup goes directly to instructions and agreement for the chosen interview mode; there is no separate “plan ready” screen or repeated mode selection. Both modes require live camera/microphone access, a single-display check, entire-screen sharing and fullscreen. Spoken interviews also require local speech readiness. Tab/focus/fullscreen changes, reduced screen coverage, stopped devices and extra displays pause the interview; clipboard, drag/drop, context-menu and supported navigation shortcuts are restricted. Restoration rechecks the conditions and preserves the draft; three server-recorded warnings end either mode. These browser controls cannot guarantee OS-level lockdown or detect every external device. Agreeing and starting creates the timed session and opens a meeting-style room with participant tiles, microphone/camera controls and questions/answers in a right-side conversation panel. Voice mode speaks the question, listens, shows rolling local captions, then sends a nonempty final transcript after five seconds of detected silence. Speaking again resets the pause; transcription must finish before sending. Maya speaks the following question and resumes listening. Text fallback and manual send remain available. Local speech is warmed during preparation; caption latency depends on the device. Education, academic projects, skills and career preparation define the interview scope.

After completion, a compact result card shows the actual score and saved/scored/pending counts. Clicking opens the detailed analysis in a responsive native dialog, with Escape/close, focus restoration and lazy-loaded report content. Completed-session links open this dialog directly. Reports include the rubric, STAR where applicable, strengths, improvement areas, per-answer transcripts/retries and coaching. Print/save PDF includes every saved answer. Closing and reopening preserves coaching; late coaching responses cannot replace another selected answer's coaching. Proctored sessions show the student's own conversation but withhold scores/coaching until completion.

Only the selected workspace screen fetches its data. Overview reads plans and statistics concurrently; statistics use one backend SQL snapshot. Sessions are filtered and paginated, and the voice engine loads on demand. Reports do not import the timed room. Separate routes improve loading boundaries; they do not distribute backend compute across servers.

Run `npm run test:interview-ui` for guided creation, attachments, retained drafts, channel preferences, coaching response isolation, print transcripts and light/dark layouts at 320–1440px.

### Observation Haki chat workspace

Haki has its own collapsible sidebar with New chat, search, resume/job-description context, and recent conversations grouped by campus date. The selected conversation stays highlighted. The sidebar edge supports dragging, Left/Right arrows, Home/End and double-click reset; the chosen width is saved on this browser. The layout reserves space for the conversation on smaller laptops. Below 901px, navigation opens in a modal drawer with Escape dismissal and focus restoration. Back to dashboard remains in the navigation footer.

Questions, formatted answers and the composer share a centered reading column. The Haki sidebar is independent of the dashboard navigation. Run `npm run test:intelligence-ui` for sidebar search, saved width, keyboard/drag resizing, conversation switching, draft preservation, mobile navigation and light/dark answer layouts.
