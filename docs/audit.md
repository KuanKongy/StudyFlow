# StudyFlow — Full Audit (2026-07-29)

This audit covers the whole application: API, worker, frontend, tests, and infrastructure
configuration. It was produced alongside a cleanup pass — each finding below is marked
**Fixed** (in this pass), **Open** (known, deliberately left), or **Accepted** (a deliberate
design decision, documented rather than changed).

**Method.** Full read of `api/src/index.js` and `worker/index.js`; full read of the frontend
page/component tree; transfer of the capstone test harness (smoke / redbar / integration)
into this repo; baseline run of all suites against the live Docker Compose stack **before**
any change, and re-runs after every pass. UI reviewed against common heuristics (visibility
of system status, error recovery, touch targets, consistency) from the perspective of a
student user.

Related docs: [claims.md](claims.md), [cct_v2.md](cct_v2.md),
[redbar_expected_failure.md](redbar_expected_failure.md).

---

## 1. Bug inventory

### Critical

| ID | Area | Finding | Status |
|----|------|---------|--------|
| B1 | API | **Member-removal cascade destroyed data in unrelated groups.** `handleMemberRemovalCascade` queried `Topics.find({ ownerId })` with no group filter, so removing a user from group A deleted *other people's materials* in every topic that user owned anywhere (including topics shared only with group B). | **Fixed** — cascade is scoped to the group being left, and a material is only deleted when its owner genuinely loses access (no remaining shared group). Regression test: `tests/redbar/auth-008-removal-cascade-scope.test.mjs`. |
| B4 | API | **Writes guarded at read level.** `PUT /api/materials/:id/note` and all flashcard writes (`PUT .../cards`, `POST /api/flashcard-sets/:id/cards`, `DELETE /api/flashcards/:id`) used `canAccessMaterial` (read access), so **any group member could overwrite or delete another member's notes and cards** — directly violating the ToS promise that users cannot modify materials they do not own. | **Fixed** — writes are owner-only; reads stay shared. Tests: `tests/redbar/auth-007-note-write-owner.test.mjs`, non-owner 403 cases in `tests/smoke/flashcards-crud.test.mjs` (the notes-crud smoke contract already expected 403). Frontend hides edit controls for non-owners. |
| B5 | API | **PII exposure.** `POST /api/users/batch` returned complete user documents — including **email addresses** — for arbitrary authIds with no relationship check; `GET /api/users/:id` did the same by Mongo id (and was dead code). The email leak surfaced in the UI: the group-member profile modal displayed other members' emails. | **Fixed** — `GET /api/users/:id` removed; `users/batch` only resolves users who share a group with the caller and projects out `email`; member modal no longer renders email. Tests: `tests/redbar/data-006-users-batch-no-pii.test.mjs`, `tests/smoke/users.test.mjs`. |

### High

| ID | Area | Finding | Status |
|----|------|---------|--------|
| B2 | Worker | **Stale job status on failure.** The worker cached `job:<id>` only on success, so a failed job kept reporting `queued`/`processing` for up to 30 s through `GET /api/jobs/:id`. | **Fixed** — `failJob()` writes the `failed` status to the cache. |
| B6 | API | **500s instead of 400s on malformed ids.** Body-supplied ids (`topicId` on notes/flashcard-sets, `groupIds` on topics) and one param id went straight into `new ObjectId(...)`, crashing with a cast error. | **Fixed** — validated everywhere; `validateId` middleware also replaced an inline duplicate on `GET /api/jobs/:id`. Test: `tests/redbar/val-001-invalid-id-400.test.mjs`. |
| — | Worker | **Null-deref on deleted source material.** Both handlers dereferenced `inputMaterial.title/.topicId` without a null check; deleting the source note while a job was queued crashed the handler. | **Fixed** — jobs now fail cleanly with "Input material no longer exists". |
| — | API | **Dead unauthenticated endpoint.** `POST /enqueue` (no JWT) enqueued a job type the worker rejects; live on every non-production deployment. `GET /api/private` echoed the full JWT payload. | **Fixed** — both removed, along with dead routes `GET /api/users/:id` and `PUT /api/materials/:id/flashcard-set` (which also wrote a string where an ObjectId belongs). |
| — | Frontend | **CreateNote always failed for "optional" fields.** Topic and content were labeled "(optional)" but the API requires both — submitting without them produced an opaque "Failed to create note". | **Fixed** — fields marked required with client-side validation and a pointer to create a topic first. |
| — | Frontend | **Blank screens.** NoteView and SummaryView rendered nothing while loading and *permanently* nothing on a failed/404 fetch. | **Fixed** — skeletons + explicit "not found" states with a way back. |
| — | Frontend | **Silent data loss in the note editor.** Navigating away with unsaved edits discarded them without warning. | **Fixed** — dirty tracking, `beforeunload` guard, and a Save / Discard / Keep-editing dialog on back-navigation. Sidebar navigation is not blocked (BrowserRouter has no navigation blocking) — noted in the roadmap. |

### Medium

| ID | Area | Finding | Status |
|----|------|---------|--------|
| B3 | API | **Rate-limit quota burned by rejected requests.** The AI rate limiter ran before validation and the circuit breaker, so 400/403/503 responses each consumed one of the user's 10 hourly credits. | **Fixed** — order is now validate → access check → circuit breaker → rate limiter; only requests that actually enqueue consume quota. |
| B7 | API | **Type drift.** `PUT /api/materials/:id/cards` stored a body-supplied `setId` as a string where every other write stores `ObjectId`, silently orphaning the card from `$in` lookups. | **Fixed** — validated and cast. |
| B9 | API | **Orphaned audit rows.** `DELETE /api/groups/:id` deleted the group but left its `groupAuditLog` entries forever. | **Fixed** — cascade added. |
| — | API | **No global error handling.** 35 of 42 routes had no try/catch and fell through to Express's HTML error page; two 500 messages and two id-validation styles coexisted; `/health` returned 200 even with Mongo/Redis down (the ALB health check target). | **Fixed** — global JSON error handler + JSON 404 catch-all; `/health` pings both dependencies (503 when down, still `{ok:true}` 200 when healthy per ops-001); startup connects guarded; explicit 100 kb JSON body limit; SIGTERM/SIGINT graceful shutdown in both services (worker finishes the in-flight job). |
| — | API | **~120 lines of verbatim duplication.** The two AI-enqueue routes differed by one string; the topic-cascade block existed twice (with a doubled `redis.del`); the audit-log insert was copy-pasted 8×; two group-join paths; the worker's fail-the-job block existed 10×; `handleGenerateSummary` had a redundant inner try/catch. | **Fixed** — shared helpers (`enqueueAiJob`, `cascadeDeleteTopic`, `audit`, `joinGroupAsMember`, `failJob`). `api/src/index.js` 1281 → 1253 lines with ~90 lines of new validation/hardening added; worker 369 → 382 with shutdown handling added. Both remain single files by design. |
| — | Worker | `dotenv` was a declared dependency but never imported — bare `npm start` ran with no OpenAI key; `job_completed` was logged even for failed jobs. | **Fixed.** |
| — | Frontend | Flashcard delete had no confirmation (every other delete is double-confirmed); shared sets showed edit/delete to non-owners; "shuffle" jumped to one random card (could repeat the current one) instead of shuffling. | **Fixed** — confirm dialog, owner-only controls, Fisher-Yates shuffle with ordered traversal. |
| — | Frontend | No page ever read `isError` — failed fetches rendered as convincing empty states ("No topics yet") instead of errors. | **Fixed** — all five list pages, TopicDetail, NoteView, and SummaryView render a retryable error state (`QueryError`). |
| — | Frontend | A single transient `/api/me` failure permanently stranded the user on "Please sign in again" until a hard reload (`fetchAttempted` ref never reset). | **Fixed** — profile fetch retries via a "Try again" button and no longer latches. |
| — | Frontend | Job-status filters disagreed: TopBar counted a nonexistent `pending` status, Dashboard dropped `retrying` — the bell badge and dashboard could show different numbers. | **Fixed** — both use `queued/processing/retrying`. |
| — | Frontend | Touch users could not delete materials on TopicDetail (`opacity-0 group-hover:opacity-100` — no hover on touch screens). | **Fixed** — controls are always visible on small screens, hover/focus-revealed on desktop. |

### Low / polish (fixed)

- NotFound page did a full page reload via `<a href="/">` (losing Auth0 in-memory state) and logged `console.error` on every render.
- JoinGroup reported every failure — including network errors — as "Invalid join code"; placeholder didn't match the real 6-character code format.
- Clipboard writes had no `.catch` (unhandled rejection on denied permission) while still toasting "copied!".
- Topic settings dialog closed with zero feedback when nothing changed.
- Dashboard flashed "No materials yet" on every cold load (no loading state).
- `TopicDetail` never cleared `selectedGroupId` on unmount (GroupDetail did).
- Assorted missing `aria-label`s on icon-only buttons in the polished pages.

### Open (known, not fixed in this pass)

| Area | Finding | Why left |
|------|---------|----------|
| API | CORS falls back to `origin: true` (reflect any origin) when `CORS_ORIGIN`/`FRONTEND_ORIGIN` are unset — including production ECS, where terraform never sets them. | Infra change (`terraform/modules/ecs/main.tf` env vars); should be set to the real frontend origin(s) at deploy time. |
| Secrets | `api/.env` **was committed in git history** (commits `9366a7d`, `68af006`) — the Auth0 M2M secret and any keys in those blobs are recoverable from history and should be **rotated**. `worker/.env` on disk holds a live OpenAI key (gitignored, correct). | Rotation is an operational action outside the repo. |
| CI | All GitHub workflows are archived (`workflow_dispatch` + `ENABLE_AWS_CICD` gate): nothing runs on push/PR, and no workflow runs the root test suites or frontend lint/tests. | CI strategy decision (Railway/Vercel migration in progress per `main-branch.yml`). |
| Frontend | `useJobs()` polls `/api/jobs` every 5 s on every authenticated page with no visibility gate; unused shadcn components (28 files) and unused deps (`zod`, `date-fns`, `recharts`, …) add weight; sidebar navigation can still bypass the unsaved-note guard (BrowserRouter lacks navigation blocking). | Each is a larger refactor (data-router migration, dependency prune) than this pass warranted. |
| Worker | Queue has no visibility timeout/ack — a worker crash mid-job leaves the job `processing` forever; the circuit-breaker counter is per-process, so horizontal scaling dilutes it. | Documented design trade-off of the raw Redis list queue (see design_choices.md). |

### Accepted deviations (deliberate, test-backed)

- **Creates return 200, not 201.** The integration suite asserts exact `200` on every create; nothing depends on 201 semantics. Left as the documented contract.
- **Note size is enforced at the AI boundary (worker), not at `POST /api/notes`.** Claim rate-002 explicitly tests "oversized note → *job fails* with worker error", i.e., large notes may exist; only AI processing caps at 50 000 chars. The frontend caps input at 50 000 and `express.json`'s 100 kb limit bounds the API. An API-side hard 400 would invert the tested claim, so it was not added.
- **`docs/cct_v1.md` line-number citations are stale** relative to the refactored tree; the file carries an editor's note and `cct_v2.md` (symbol-based) is authoritative.

---

## 2. UI/UX review — grades per area

Graded for the target user: a student organizing course material, on both laptop and phone.
Grades reflect the state **after** this pass; "before" notes what changed.

| Area | Grade | Notes |
|------|-------|-------|
| **Auth & onboarding** | **B+** | Auth0 Universal Login (no password handling in-app — good), clean 3-step onboarding with real ToS/Privacy scroll-through. Before: a transient profile-fetch failure stranded users (fixed, now retryable). Remaining: `/app/onboarding` sits outside the auth guard; fields can initialize before the profile loads. |
| **Dashboard** | **B+** | Good quick actions and recent-materials feed. Before: flashed "No materials yet" on every load and undercounted active jobs (both fixed). Remaining: no per-card links into the exact material type for summaries vs notes edge cases. |
| **Groups (list / detail / join)** | **B** | Solid flows: join codes, public groups, member management, audit-backed membership. Fixed: error branching on join, clipboard failure handling, email no longer shown in member profiles. Remaining: GroupDetail is a 500-line page that duplicates `UserProfileModal` inline; member count assumes the owner is in `memberIds`. |
| **Topics & TopicDetail** (the "hub" page) | **A−** | The strongest page after polish: three-column layout with per-column skeletons, empty states with CTAs (including the previously dead-end Summaries column), touch-visible owner-only delete buttons with confirmation, real not-found/error states instead of a silent redirect, aria-labels on icon buttons. Remaining: still fetches all topics/groups to render one topic (no single-topic endpoint). |
| **Notes & NoteView** (where students spend most time) | **A−** | Fixed the worst offenders: blank-screen load/error → skeleton + not-found; silent edit loss → dirty tracking, beforeunload guard, save/discard dialog; read-only banner for shared notes; save button reflects mutation state; specific 429/503 AI error messages. Remaining: no autosave, no note rename anywhere in the app, sidebar nav can bypass the guard. |
| **Flashcards & study mode** | **B** | Fixed: delete confirmation, owner-only controls, a real shuffle, loading skeletons. Remaining for a real study tool: no "mark known"/spaced repetition, progress resets on remount, no keyboard navigation (space to flip, arrows to move). |
| **Summaries & AI jobs** | **B** | Clear AI disclosure before first use (privacy-respecting), jobs page maps 429/503 to human messages, generation discoverable from both NoteView and now the TopicDetail empty state. Remaining: AI disclosure acceptance is session-only (re-prompts after refresh); job list polls every 5 s forever. |
| **Navigation & information architecture** | **B+** | Sidebar with collapsible sections + top bar works well; group → topic → material hierarchy is legible. Remaining: no breadcrumbs (`ui/breadcrumb.tsx` sits unused), back-navigation is a mix of explicit links and `navigate(-1)`, unmatched `/app/*` routes drop the whole app chrome. |
| **Loading / error / empty states** | **A−** | Was the weakest systemic area (three loading idioms, zero error states anywhere, `ui/skeleton.tsx` unused). Now: skeletons on all polished pages, a shared retryable `QueryError` on every list page and detail page, consistent empty states with CTAs. Remaining: a few pages still hand-roll `animate-pulse` divs instead of `Skeleton`. |
| **Visual design system** | **B+** | Genuinely good token layer (HSL variables, domain colors per material type, dark mode fully wired with system default). Remaining drift: 4 copy-pasted filter tab bars, ~9 hand-copied destructive button class strings (one "Leave group" confirm is blue), page max-widths vary arbitrarily (`max-w-4xl`…`max-w-7xl`), Google-Fonts import is render-blocking, theme toggle only reachable inside the mobile drawer. |
| **Accessibility** | **C+** | Improved: aria-labels on polished pages' icon buttons, labeled textarea, focus-visible reveal for hover controls, shadcn focus rings throughout. Still short of baseline: pervasive `<Link><Button>` nesting (~30 sites, invalid HTML/double focus stops), filter tabs are plain buttons without `role="tab"`, most avatars lack `alt`, no skip-to-content link. |
| **Mobile / touch** | **B** | Responsive layout is broadly good (recent "UI responsiveness" pass covered most pages); destructive controls now reachable on touch; SummaryView header now wraps. Remaining: theme toggle buried in drawer; no PWA/offline story. |

**Overall: B+.** The app is genuinely usable for a student: the core loop (topic → note →
AI summary/flashcards → study) works end-to-end, looks coherent, and now fails visibly
instead of silently. The gap to an A is a real study mode (spaced repetition, progress
persistence), autosave, and an accessibility pass.

---

## 3. Test posture

**Before this pass:** zero backend tests in this repo (both services stubbed `npm test`
with a placeholder echo); one placeholder frontend vitest. The capstone repo's suite
referenced this code but lived elsewhere.

**Transferred + adapted** (paths rewritten from the `StudyFlow/` wrapper layout):

| Suite | What it is | Count (final) |
|-------|------------|---------------|
| `tests/smoke` | Self-contained contract tests (in-process mock servers, no stack needed) | **42 pass** (37 transferred + 5 new) |
| `tests/integration` | Live end-to-end flow against Docker Compose + Auth0 M2M | **11 pass** |
| `tests/redbar` | One file per claim; live HTTP + seeded Mongo/Redis + terraform reads | **36 pass, 2 stub-gated** (30 transferred + 4 new claims: auth-007, auth-008, data-006, val-001) |

- **Baseline (pre-change) run was fully green** — 37/11/32+2 — so every behavior change
  was made against a verified baseline, with suites re-run after each pass.
- The two skips (`ai-001` backoff, `ai-002` circuit breaker) require the local 429 stub
  (`REDBAR_RUN_AI001_STUB=1` + `OPENAI_BASE_URL` pointed at it); both were run this way
  and **pass** — before and after the middleware reorder.
- Live suites are timing-sensitive (worker restarts, real OpenAI calls): one transient
  failure was observed in a back-to-back full run and was green on immediate rerun.
  Treat single-run failures of `ops-003`/`ai-003`/`gov-003` as suspect-flaky before
  suspecting a regression.
- **Remaining gaps:** no frontend component tests beyond the placeholder (vitest +
  Testing Library are installed and configured); no CI executes any of these suites;
  no load/perf tests.

Run commands: `npm run test:smoke` (offline) · `docker compose up -d` then
`npm run test:integration` and `npm run test:redbar` · `npm test` (all, with receipt log).
Gotchas: the API must be on `127.0.0.1:4000` (unset `PORT`; redbar *skips silently*
when unreachable — check the skip count), and don't run integration concurrently with
redbar (two redbar tests stop/start the worker container).

---

## 4. Improvement roadmap (student-user focus)

**Now (small, high value)**
- Autosave in NoteView (debounced) — makes the unsaved-changes guard mostly moot.
- Note rename (title edit in NoteView header; API already accepts `title` on PUT).
- Persist AI-disclosure acceptance (localStorage or user profile) so it stops re-prompting.
- Set `CORS_ORIGIN` in the ECS task definition; rotate the historically committed secrets.
- Keyboard controls in study mode (space = flip, ←/→ = navigate).
- Gate the `useJobs` 5 s poll on document visibility + an active-jobs condition.

**Next (product-shaping)**
- **Study mode worth studying with:** mark cards known/unknown, session persistence,
  simple spaced repetition (Leitner boxes are enough), per-set progress.
- **Collaborative editing decision:** writes are now owner-only (ToS-aligned). If shared
  editing is actually wanted, it needs an explicit product design (per-material permissions
  or suggestion flow), API changes, and new claims — not a silent `canAccessMaterial` guard.
- Search across notes/topics; breadcrumbs; single-topic endpoint (`GET /api/topics/:id`)
  so TopicDetail stops fetching everything.
- Frontend component tests for the fixed behaviors (CreateNote validation, QueryError
  rendering, owner-gating in FlashcardsView) — the vitest harness is already configured.
- Reactivate CI: root suites + frontend lint/build on PR (workflows exist but are archived).

**Later**
- Migrate to a data router (or TanStack Router) for real navigation blocking and route-level
  data loading; prune the 28 unused shadcn files and unused dependencies.
- Job queue acks/visibility timeout (or a purpose-built queue) + shared circuit-breaker
  state in Redis so scaling the worker doesn't dilute it.
- Accessibility pass to WCAG AA: fix link/button nesting, tab semantics, alt text, skip link.
- PWA/offline notes for studying without connectivity.

---

## 5. Verification transcript (final state)

```
npm run lint                  → clean (root: tests/ + scripts/)
npm run test:smoke            → 42 pass / 0 fail
docker compose up -d --build  → mongo, redis, api (:4000), worker
curl localhost:4000/health    → {"ok":true}   (503 {"ok":false} when a dependency is down)
npm run test:integration      → 11 pass / 0 fail
npm run test:redbar           → 36 pass / 0 fail / 2 skipped (stub-gated)
REDBAR_RUN_AI001_STUB=1 + stub worker → ai-001 pass, ai-002 pass
cd frontend && npm run lint   → 0 errors (38 pre-existing warnings)
cd frontend && npm run build  → success
cd frontend && npm test       → 1 pass (placeholder)
```

Commits in this pass: `b87380f` (test suite + docs transfer), `34d04cc` (backend cleanup),
`6321174` (bug fixes), `6d9b666` (hardening), `97419fb` (regression tests),
`6f4abd7` (UI fixes and polish).
