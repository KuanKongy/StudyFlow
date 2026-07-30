# Evidence Plan

Describe what you plan to prove, where the evidence will live, and how you will collect it.

Link for the implementation: current MVP (see [KuanKongy/StudyFlow](https://github.com/KuanKongy/StudyFlow))

This file was used to draft **candidate proof strategies** while the claim set was being refined. The final claim wording and current enforcement summary live in [claims.md](claims.md). The goal here is to keep the planned artifacts and collection steps consistent with those final claims rather than to restate every claim verbatim.

Evidence policy for this pack:
- If a claim has an automated test, the **test run itself is evidence**. Save the command, passing output/log, timestamp, and commit hash for that run.
- If a claim does not have an automated test, provide a **manual evidence artifact** such as a screenshot or console capture, plus a short written explanation of why that artifact proves the claim at the stated enforcement point.
- For every final evidence block, capture: command or procedure, output or artifact path, timestamp, and commit hash for the commit under review.

All evidence artifacts will be stored in the `evidence/` directory of this repository. **Automated test commands** and pass/fail records for many claims are also listed in [evidence/index.json](../evidence/index.json). **Root** `npm test` runs redbar + smoke + integration tests; **root** `npm run lint` runs ESLint on `tests/`, `api/src`, and `worker`. `ai-001` and `ai-002` are the intentional exception: they require a **separate stub-backed Worker run** (`REDBAR_RUN_AI001_STUB=1` plus Worker `OPENAI_BASE_URL` pointed at the local 429 stub) so the live retry/breaker path is proven without paying for real OpenAI traffic. **Local gate:** [githooks/pre-commit](../githooks/pre-commit) runs those commands before each commit, and rejects staged `.env` files. **Reproducible stack for integration tests:** start [docker-compose.yml](../docker-compose.yml) so API/Redis/Mongo match the expected environment. **Production observability:** structured JSON logs, request/job correlation, CloudWatch alarms and dashboard — [docs/observability.md](observability.md). This monorepo has **no** GitHub Actions workflow at the repo root; StudyFlow deploy pipelines live under [.github/workflows/](../.github/workflows/).

## Authentication and Authorization

**Claim: "auth-001"** — All /api/* endpoints require valid Auth0 JWT  
Evidence artifact(s): Screenshot or terminal output of HTTP request/response  
Command or procedure: Request `GET /api/me` without token, then with valid token  
Success criteria: First request returns 401. Second request returns 200 with user JSON.  
Automated: `node --test tests/redbar/auth-001-jwt-required.test.mjs`

**Claim: "auth-002"** — Only owner can delete group  
Evidence artifact(s): Terminal output showing 403 for non-owner  
Command or procedure: Authenticate as User B (not the group owner) and attempt delete  
Success criteria: Returns 403 Forbidden. Group still exists when queried.  
Automated: `node --test tests/redbar/auth-002-owner-delete.test.mjs`

**Claim: "auth-003"** — Owner-controlled membership changes; public self-join  
Evidence artifact(s): Terminal output: non-owner cannot add *another* user or remove someone else; non-owner can `POST` self on a public group; private group blocks non-owner self-`POST`  
Command or procedure: See `tests/redbar/auth-003-owner-remove.test.mjs` cases  
Success criteria: Matches [claims.md](claims.md) auth-003 clause.  
Automated: `node --test tests/redbar/auth-003-owner-remove.test.mjs`

**Claim: "auth-004"** — Topic list isolation + owner-only topic update  
Evidence artifact(s): JSON response showing topic lists; 403 on `PUT` as non-owner  
Command or procedure: User B outside group does not see group topic in `GET /api/topics`; non-owner `PUT /api/topics/:id` → 403  
Success criteria: List isolation holds; updates require topic ownership.  
Automated: `node --test tests/redbar/auth-004-topic-isolation.test.mjs`

**Claim: "auth-005"** — Material access isolation + topic-scoped create  
Evidence artifact(s): Terminal output showing 403 when accessing or creating in another user's topic  
Command or procedure: Seed inaccessible materials; attempt reads and `POST /api/notes` / `POST /api/flashcard-sets` with foreign `topicId`  
Success criteria: Reads and creates return 403 when the user lacks topic access.  
Automated: `node --test tests/redbar/auth-005-material-isolation.test.mjs`

**Claim: "auth-006"** — Job status only for job owner  
Evidence artifact(s): 403 when polling another user's job id  
Command or procedure: Insert job with foreign `ownerId`; call `GET /api/jobs/:id` as M2M user  
Success criteria: 403 for foreign job; 200 for own job.  
Automated: `node --test tests/redbar/auth-006-job-owner.test.mjs`

## Data Protection

**Claim: "data-001"** — Encryption at rest (MongoDB Atlas TDE)  
Evidence artifact(s): Screenshot of MongoDB Atlas encryption settings  
Command or procedure: Navigate to MongoDB Atlas → cluster security/encryption settings  
Success criteria: Encryption at rest is enabled for the live cluster.  

**Claim: "data-002"** — TLS in transit  
Evidence artifact(s): Connection log or provider settings screenshot showing TLS  
Command or procedure: Inspect Atlas/Redis connection configuration and, where practical, show non-TLS is rejected  
Success criteria: MongoDB and Redis connections use TLS-enabled URLs/settings.  

**Claim: "data-003"** — Tracked source files are checked for obvious secret literals; runtime secrets supplied separately  
Evidence artifact(s): Output of secret scanning command + hook evidence  
Command or procedure: Run red-bar scan; show `.env` ignore rules and pre-commit staged-`.env` rejection  
Success criteria: No obvious secret literals are found in tracked files; `.env` files are gitignored; hook blocks staged `.env` files.  
Automated: `node --test tests/redbar/data-003-secrets-scan.test.mjs`

**Claim: "data-004"** — OpenAI key isolated to Worker and not referenced by frontend client source  
Evidence artifact(s): Committed Terraform ECS task definitions + frontend source scan (repo-local; optional live ECS JSON separately)  
Command or procedure: Run automated test that reads `terraform` and `frontend/src`  
Success criteria: API task definition has no `OPENAI_API_KEY` secret reference; Worker task definition includes it; frontend source tree does not reference `OPENAI_API_KEY` or `VITE_OPENAI_*`.  
Automated: `node --test tests/redbar/data-004-worker-secret-isolation.test.mjs`

**Claim: "data-005"** — Account deletion cascade for StudyFlow-managed data  
Evidence artifact(s): Terminal output of sequential verification queries after `DELETE /api/account`  
Command or procedure:  
  1. Obtain JWT for user A and create the `users` row via `GET /api/me`
  2. Seed MongoDB with note, summary, flashcard-set, flashcards, jobs, topics, groups, and audit-log records owned by the user
  3. Seed Redis with `cache:{userId}:*` keys and at least one queued payload in `queue:jobs`
  4. Call `DELETE /api/account` with user A's JWT → expect 200  
  5. Verify MongoDB — user-owned StudyFlow data returns 0 or missing across all claimed collections
  6. Verify Redis — `cache:{userId}:*` is empty and queued payloads for the user are gone  
Success criteria: User-owned StudyFlow data and queued/cache artifacts are removed across every collection named in the claim.  
Automated: `node --test tests/redbar/data-005-account-deletion.test.mjs`

## Rate Limiting

**Claim: "rate-001"** — 10 AI requests per user per hour  
Evidence artifact(s): Burst test output showing 429 responses  
Command or procedure: Submit 11 or 12 AI job requests in one hour window  
Success criteria: Requests 1-10 return 200 (job created). Subsequent requests return 429.  
Automated: `node --test tests/redbar/rate-001-ai-rate-limit.test.mjs`

**Claim: "rate-002"** — 50,000 character limit on AI input  
Evidence artifact(s): Job status showing `failed` with note-size error  
Command or procedure: Create note with 60,000 characters, trigger AI generation, inspect job status  
Success criteria: Job status becomes `failed` with note-size rejection message.  
Automated: `node --test tests/redbar/rate-002-note-size.test.mjs`

## AI Resilience

**Claim: "ai-001"** — OpenAI 429 backoff and retry exhaustion  
Evidence artifact(s): Job document with retry/failure status; worker logs; stub request count  
Command or procedure: Point Worker `OPENAI_BASE_URL` at local 429 stub, enqueue flashcard job, poll `/api/jobs`, then inspect persisted `retries`  
Success criteria: Worker hits the 429 stub multiple times, job `retries` reaches the configured limit, and the job only then ends `failed` with a rate-limit message.  
Automated: `REDBAR_RUN_AI001_STUB=1 node --test tests/redbar/ai-001-backoff.test.mjs`

**Claim: "ai-002"** — Circuit breaker blocks new AI jobs when tripped  
Evidence artifact(s): API response showing 503 unavailable  
Command or procedure: Point Worker `OPENAI_BASE_URL` at local 429 stub, enqueue an AI job until repeated 429s trip `circuit-breaker:openai`, then submit a fresh AI job  
Success criteria: Worker sets `circuit-breaker:openai`, and the fresh API request returns 503 with unavailable message.  
Automated: `REDBAR_RUN_AI001_STUB=1 node --test tests/redbar/ai-002-circuit-breaker.test.mjs`

**Claim: "ai-003"** — Queue and cached job-status separation  
Evidence artifact(s): Redis output showing queued payload in `queue:jobs` and cached status in `job:{id}`  
Command or procedure: Stop Worker, enqueue summary job, confirm payload appears in `queue:jobs`, restart Worker, wait for completion, then confirm `job:{id}` cache exists  
Success criteria: Pending AI work and cached job status occupy separate Redis namespaces and the queued payload disappears after processing.  
Automated: `node --test tests/redbar/ai-003-queue-cache-separation.test.mjs`

## Data Residency

**Claim: "res-001"** — AWS infra, Atlas, and Redis configured for `ca-central-1`  
Evidence artifact(s): Terraform config excerpts + Atlas screenshot + Redis screenshot  
Command or procedure: Show committed production `config.tfvars` and provider region wiring, then capture live Atlas and Redis region settings  
Success criteria: Production Terraform config is locked to `ca-central-1`, and Atlas/Redis screenshots also show `ca-central-1`.  
Automated (Terraform config check): `node --test tests/redbar/res-001-terraform-region.test.mjs`

**Claim: "res-002"** — AI data transit disclosure  
Evidence artifact(s): Screenshot of UI disclosure shown before AI feature use  
Command or procedure: Navigate to a note → click AI action → screenshot disclosure/consent step  
Success criteria: User sees a clear message that note content is sent to OpenAI and may transit through US servers before AI action continues. Note view AI actions share one disclosure component, so one screenshot can stand in for all triggers on that screen.  

**Claim: "res-003"** — AI provider rationale and migration path  
Evidence artifact(s): Link or excerpt from [docs/design_choices.md](design_choices.md)  
Command or procedure: Confirm the AI provider section evaluates alternatives and names Bedrock as migration target  
Success criteria: Evaluated alternatives and migration path are documented.  

## Access Control (Governance)

**Claim: "gov-001"** — Personal notes invisible to group members  
Evidence artifact(s): HTTP response showing 403 for unauthorized access  
Command or procedure: Query note while unauthorized  
Success criteria: Returns 403, not the note content.  
Automated: `node --test tests/redbar/auth-005-material-isolation.test.mjs`

**Claim: "gov-002"** — AI processing requires note access  
Evidence artifact(s): HTTP response showing 403 for unauthorized AI request  
Command or procedure: User without access attempts both summary and flashcard generation on another user's note  
Success criteria: Both routes return 403 Forbidden. No job created.  
Automated: `node --test tests/redbar/gov-002-ai-ownership.test.mjs`

**Claim: "gov-003"** — Summaries link to source note via `derivedFrom`  
Evidence artifact(s): MongoDB query output for generated summary material  
Command or procedure: Generate summary, then query `studyMaterials` for the result  
Success criteria: Summary material exists and `derivedFrom` equals source note `materialId`.  
Automated: `node --test tests/redbar/gov-003-flashcard-materialid.test.mjs`

**Claim: "gov-004"** — Note deletion removes note data, derived summaries, and related topic cache  
Evidence artifact(s): Sequential API calls showing deletion; Redis cache-key check  
Command or procedure: Prime the topic-materials cache, delete note, then verify note is gone, summary cleanup occurred, and the topic cache key was removed  
Success criteria: Source note GET returns 404; derived summaries are removed; `topic:{topicId}:materials` is gone. Flashcards are intentionally not part of this claim.  
Automated: `node --test tests/redbar/gov-004-note-delete.test.mjs`

**Claim: "gov-005"** — Group membership audit log  
Evidence artifact(s): MongoDB query output for `groupAuditLog`  
Command or procedure: Exercise group create, add, remove, join, leave, and owner `PUT` with `memberIds` changes; inspect `groupAuditLog`  
Success criteria: Create, add, remove, join, leave, and PUT-driven membership deltas produce rows with actor, target, group, action, and timestamp.  
Automated: `node --test tests/redbar/gov-005-membership-audit.test.mjs`

## CI/CD and Deployment

**Claim: "cicd-001"** — Tests/lint gate the configured local commit path and StudyFlow-only pull-request path  
Evidence artifact(s): Terminal output from failing pre-commit, or blocked merge screenshot for StudyFlow-only remote  
Command or procedure: Trigger failing lint/test locally; optionally verify StudyFlow-only PR checks  
Success criteria: Commit or merge is blocked when required checks fail.  

**Claim: "cicd-002"** — GitHub Actions–driven deploy with UI approval  
Evidence artifact(s): GitHub Actions deploy run showing approval / environment gate  
Command or procedure: Inspect deploy workflow run; confirm protected environment or manual approval step before apply  
Success criteria: Production changes are tied to Actions runs; approval happens in the GitHub UI (documented path, not ad-hoc SSH).  

**Claim: "cicd-003"** — Docker image vulnerability scan  
Evidence artifact(s): ECR scan on push (Terraform `scan_on_push`); build workflow pushes images; review screenshot before apply  
Command or procedure: `build-images.yml` pushes to ECR → scan runs → reviewer checks ECR console → approve deploy/Terraform  
Success criteria: Terraform enables scanning on the ECR repos; scan results are reviewed before production apply.  
Automated Terraform check: `node --test tests/redbar/cicd-003-ecr-scan.test.mjs`

## Operational

**Claim: "ops-001"** — Health check endpoint used by ALB  
Evidence artifact(s): ALB target group health check config + `curl` output  
Command or procedure: Call `/health` and inspect Terraform ALB target-group config  
Success criteria: Health endpoint returns `{ "ok": true }`; Terraform target-group health check path is `/health`.  
Automated: `node --test tests/redbar/ops-001-health.test.mjs`

**Claim: "ops-002"** — CloudWatch log retention = 30 days  
Evidence artifact(s): CloudWatch log group configuration  
Command or procedure: Inspect production Terraform `awslogs` config, retention config, and CloudWatch log-group receipt  
Success criteria: ECS tasks use `awslogs`, production Terraform config sets `log_retention_days = 30`, and the CloudWatch receipt shows 30-day retention.  
Automated Terraform check: `node --test tests/redbar/ops-002-cloudwatch-terraform.test.mjs`

**Claim: "ops-003"** — Worker resumes processing queued jobs after crash/restart  
Evidence artifact(s): Passing red-bar test log showing queue recovery after Worker restart  
Command or procedure: Stop Worker, enqueue jobs, restart Worker, then poll job statuses  
Success criteria: Jobs that remained queued in Redis are processed after Worker restart.  
Automated: `node --test tests/redbar/ops-003-worker-recovery.test.mjs`

**Claim: "ops-004"** — Failed AI jobs do not block queue progress  
Evidence artifact(s): Job status output showing one failed job followed by later queued work reaching terminal state  
Command or procedure: Queue a deliberately broken job, then queue a second job  
Success criteria: First job is marked `failed` with error; later job still reaches its own terminal state.  
Automated: `node --test tests/redbar/ops-004-failed-job-continues-queue.test.mjs`
