# Clause → Control → Test (CCT) v2

Link for the implementation: current MVP (see [KuanKongy/StudyFlow](https://github.com/KuanKongy/StudyFlow))

Changes from v1 and earlier drafts: dropped the unimplemented CMK requirement from `data-001`; narrowed `data-005` to StudyFlow-managed data deletion rather than Auth0 deletion; clarified `res-001` to combine Terraform region config with manual Atlas/Redis region evidence; corrected `gov-003` to cover summary provenance rather than flashcard provenance; clarified `gov-004` to keep flashcards after source-note deletion by design; split `ai-001` and `ai-002` cleanly and updated `ai-001` to match the shipped backoff mechanism; added stronger verification coverage for `data-003`, `data-004`, and `ops-004`.  
Additions: `auth-004` adds owner-only `PUT /api/topics/:id`; `auth-005` adds topic checks for note/flashcard-set creation; `auth-006` job owner check on `GET /api/jobs/:id`; `gov-005` adds create + `PUT` membership audit; `auth-003` owner adds/removes others; non-owner may self-join public groups via `POST /api/groups/:id/members`.

## Authentication and Authorization

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| * "All /api/* endpoints require valid Auth0 JWT" | express-oauth2-jwt-bearer middleware applied to `/api` route prefix | Send request to `GET /api/me` with no Authorization header → expect 401 | api/src/index.js — `app.use("/api", checkJwt)` | [evidence/index.json](../evidence/index.json) · `tests/redbar/auth-001-jwt-required.test.mjs`; optional screenshot: `evidence/auth-001-unauthorized-test.png` |
| * "Only the group owner can delete that group" | Ownership check compares `group.ownerId` to `req.auth.payload.sub` | Non-owner sends `DELETE /api/groups/:id` → expect 403 | api/src/index.js — `DELETE /api/groups/:id` | [evidence/index.json](../evidence/index.json) · `tests/redbar/auth-002-owner-delete.test.mjs`; optional screenshot |
| * "Owner adds/removes others; non-owner may self-join public groups; join-by-code uses `/api/groups/join`" | Owner-only for adding *other* users; `DELETE` blocked for non-owner except self; public = no `joinCode` | Non-owner `POST` with another `userId` → 403; non-owner `POST` self on public group → 200; private self-`POST` → 403; non-owner `DELETE` other → 403 | api/src/index.js — `POST`/`DELETE /api/groups/:id/members` | [evidence/index.json](../evidence/index.json) · `tests/redbar/auth-003-owner-remove.test.mjs` |
| * "Users can only see their own topics + topics from their groups; only owner updates topic" | Query filtering on `GET /api/topics`; `topic.ownerId` check on `PUT` | Hidden topic omitted from list; non-owner `PUT /api/topics/:id` → 403 | api/src/index.js — `GET`/`PUT /api/topics` | [evidence/index.json](../evidence/index.json) · `tests/redbar/auth-004-topic-isolation.test.mjs` |
| * "Users can only access materials they own or that belong to their group's topics" | `canAccessMaterial()` on reads; `canAccessTopic()` for `POST` notes and flashcard sets | User B blocked from reads and from creating in inaccessible topic | api/src/index.js — material + topic-scoped create | [evidence/index.json](../evidence/index.json) · `tests/redbar/auth-005-material-isolation.test.mjs` |
| * "Job status only for job owner" | `job.ownerId === req.auth.payload.sub` on `GET /api/jobs/:id` | Poll another user's job id → 403 | api/src/index.js — `GET /api/jobs/:id` | [evidence/index.json](../evidence/index.json) · `tests/redbar/auth-006-job-owner.test.mjs` |

Claim: "auth-005"  
Naive control: "Only group members can see group topics, so they can't find material IDs."  
What could go wrong: Security through obscurity. Material IDs are guessable enough to be probed directly.  
The catch test: User A creates a personal note. User B calls `GET /api/materials/:materialId/note` with A's ID. **Expect 403** — enforced via `canAccessMaterial()`.

## Data Protection

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| * "Data encrypted at rest via MongoDB Atlas TDE (AES-256)" | Atlas default encryption-at-rest remains enabled on the deployed cluster | Inspect Atlas encryption settings → encryption must be enabled | MongoDB Atlas cluster configuration | `evidence/receipts/data-001-encryption.png` |
| * "All service-to-database connections use TLS" | MongoDB URI uses `mongodb+srv://`; Redis URL uses TLS (`rediss://`) | Inspect connection strings and provider settings → TLS must be required | MongoDB Atlas; hosted Redis config | `evidence/receipts/data-002-mongo-secret.png`; `evidence/receipts/data-002-mongo-tls.png`; `evidence/receipts/data-002-redis-secret.png`; `evidence/receipts/data-002-redis-tls.png` |
| * "Tracked source files are checked for obvious secret literals; `.env` files are gitignored and blocked at pre-commit; production runtime secrets are supplied separately" | `.env` files are gitignored, pre-commit rejects staged `.env` files, runtime secrets come from Secrets Manager, tracked files are scanned heuristically | Run secret heuristic scan; verify `.env` ignore rules and hook guard | `.gitignore`; `githooks/pre-commit`; Terraform/ECS config | [evidence/index.json](../evidence/index.json) · `tests/redbar/data-003-secrets-scan.test.mjs` |
| * "OpenAI API key is not injected into the API task or frontend client source tree; only Worker receives it" | Worker ECS task injects `OPENAI_API_KEY`; API ECS task does not; frontend client source tree does not reference it | Read committed Terraform task-def blocks + scan frontend source tree (repo-local; not live AWS API) | [terraform/modules/ecs/main.tf](../../terraform/modules/ecs/main.tf); [frontend/src/](../../frontend/src/) | [evidence/index.json](../evidence/index.json) · `tests/redbar/data-004-worker-secret-isolation.test.mjs` |
| * "Deleting an account removes all StudyFlow-managed user-authored content, derived AI artifacts, and Redis cache/queue entries for that user" | `DELETE /api/account` triggers ordered cascade over MongoDB + Redis; Worker skips jobs for deleted users | Delete account → verify user-owned StudyFlow data and queued/cache artifacts are gone | api/src/index.js — `DELETE /api/account`; worker/index.js — deleted-user guard | [evidence/index.json](../evidence/index.json) · `tests/redbar/data-005-account-deletion.test.mjs`; optional log |

Claim: "data-001"  
Naive control: Assume the earlier CMK-based plan is still what shipped.  
What changed: The shipped stack uses Atlas default encryption at rest. That is the control we claim here.  
The catch test: Atlas encryption settings must show encryption at rest enabled on the live cluster. If the cluster is unencrypted, the claim fails.

Claim: "data-005"  
Naive control: Delete only the `users` document and assume the rest cascades.  
What could go wrong: Notes, study materials, jobs, summaries, flashcards, cache keys, and queued job payloads can remain orphaned.  
What changed: Auth0 deletion is **not** part of the shipped claim. Auth0 identity is intentionally retained so users can sign in again without repeating onboarding, while all StudyFlow-managed data is removed.  
The catch test: Run the full deletion sequence and fail if any user-owned StudyFlow data or Redis artifacts remain.

## Rate Limiting

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| * "10 AI job requests per user per hour" | Redis `INCR` + `EXPIRE` on `rate:{userId}:ai` in middleware | Send 11 `POST /api/materials/:id/flashcards` requests → request 11 must receive 429 | api/src/index.js — `aiRateLimiter` | [evidence/index.json](../evidence/index.json) · `tests/redbar/rate-001-ai-rate-limit.test.mjs` |
| * "Notes over 50,000 chars are rejected for AI processing" | Worker checks note length before OpenAI call and marks the job failed | Submit 60,000-char note → trigger AI generation → job status must become `failed` | worker/index.js — summary/flashcard handlers | [evidence/index.json](../evidence/index.json) · `tests/redbar/rate-002-note-size.test.mjs` |

Claim: "rate-001"  
Naive control: Use an in-memory per-process rate limiter.  
What could go wrong: Multi-instance API scaling bypasses the limit.  
The catch test: Burst one user's AI requests and ensure the 11th request receives 429 regardless of instance routing.

## Data Residency

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| * "Production AWS infrastructure is configured for ca-central-1, and managed Atlas/Redis deployments are configured in ca-central-1" | Terraform provider/config uses `ca-central-1`; production `config.tfvars` records the region; Atlas/Redis console settings are captured as evidence | Check committed production Terraform config and capture Atlas/Redis region screenshots | Terraform config; Atlas/Redis provider consoles | `evidence/receipts/res-001-mongo.png`; `evidence/receipts/res-001-redis.png`; `tests/redbar/res-001-terraform-region.test.mjs` |
| * "Note content transits to OpenAI (US) for AI processing — disclosed to users before first use" | Disclosure modal is shown before AI action continues | Navigate to note → click AI action → disclosure must appear before request is sent | frontend `NoteView`; Worker/OpenAI call path | `evidence/receipts/res-002-modal.png` |
| * "OpenAI is the current AI provider; AWS Bedrock (ca-central-1) is the documented migration target if residency requirements tighten" | Provider choice and migration target are documented in design choices | Review `design_choices.md` → must include evaluated alternatives and Bedrock migration path | [docs/design_choices.md](design_choices.md) | `docs/design_choices.md` |

Claim: "res-001"  
Naive control: Point only at Terraform default variables and ignore actual deployed store regions.  
What could go wrong: The docs could claim Canadian residency while Atlas/Redis are deployed elsewhere.  
What changed: The claim now combines Terraform region config with manual Atlas/Redis proof rather than pretending Terraform alone controls external providers.

Claim: "res-003"  
Naive control: Treat the current AI provider as an implicit product detail instead of an audited design choice.  
What could go wrong: Reviewers cannot tell whether the residency trade-off was accepted knowingly or just inherited by accident.  
The catch test: `docs/design_choices.md` must explicitly name OpenAI as the current provider and AWS Bedrock in `ca-central-1` as the migration target.

## Access Control (Governance)

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| * "Personal notes invisible to group members" | Row-level ACL via `canAccessMaterial()` | Authenticated user GETs another user's personal note → expect 403 | api/src/index.js — note/material routes | [evidence/index.json](../evidence/index.json) · `tests/redbar/auth-005-material-isolation.test.mjs` |
| * "AI processing requires access to source note (ownership or group membership)" | Access check via `canAccessMaterial()` before enqueueing summary/flashcard jobs | User B triggers `POST /api/materials/:id/flashcards` and `.../summary` on User A's note → expect 403 and no job created | api/src/index.js — AI job handlers | [evidence/index.json](../evidence/index.json) · `tests/redbar/gov-002-ai-ownership.test.mjs` |
| * "AI-generated summaries link to their source note" | Summary material stores `derivedFrom = inputMaterial._id` | Generate summary → query summary material → `derivedFrom` must equal source note material ID | worker/index.js — summary insertion | [evidence/index.json](../evidence/index.json) · `tests/redbar/gov-003-flashcard-materialid.test.mjs` |
| * "Deleting a note removes note content, note studyMaterial, derived summaries, and invalidates related caches" | Note delete handler removes note material/content, cascades summaries by `derivedFrom`, and clears `topic:{topicId}:materials` | Delete note → GET note returns 404; derived summary is removed; topic cache key is gone | api/src/index.js — `DELETE /api/materials/:id/note` | [evidence/index.json](../evidence/index.json) · `tests/redbar/gov-004-note-delete.test.mjs` |
| * "All group membership changes are logged with actor, target, groupId, action, and timestamp" | Create, add/remove/join/leave, owner `PUT` with `memberIds` write `groupAuditLog` | Exercise create, add, remove, join, leave, and `PUT` memberIds → audit rows | api/src/index.js — groups + membership | [evidence/index.json](../evidence/index.json) · `tests/redbar/gov-005-membership-audit.test.mjs` |

Claim: "gov-003"  
Naive control: Assume flashcards already carry source-note provenance because they have a `materialId`.  
What changed: The actual provenance field is on **summaries** via `derivedFrom`. The claim and test were corrected to match the shipped implementation.

Claim: "gov-004"  
Naive control: Assume every derived artifact must be deleted with the source note.  
What changed: Summaries are deleted with the source note, but flashcards are intentionally retained. They are treated as stand-alone knowledge artifacts rather than dependent views of the note.  
The catch test: Delete a note and ensure the note disappears, derived summaries disappear, and the `topic:{topicId}:materials` cache entry is cleared. Flashcards are not part of this claim.

Claim: "gov-001"  
Naive control: Assume group visibility is the same thing as personal-note visibility.  
What could go wrong: A group member who learns a personal material ID could read another user's private note.  
The catch test: Reuse the `auth-005` enforcement path and require a 403 when a non-owner requests another user's personal note by material ID.

## AI Resilience

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| * "OpenAI 429 responses trigger exponential backoff and job re-queuing, not immediate failure" | Worker catches 429, increments retries, sets `status: "retrying"`, waits with exponential delay, then requeues; only after retries are exhausted is the job marked failed | Point Worker to a local 429 stub → job must make repeated upstream calls, record exhausted retries, and then fail | worker/index.js — `callOpenAI()` | [evidence/index.json](../evidence/index.json) · `tests/redbar/ai-001-backoff.test.mjs` |
| * "When the AI circuit breaker is tripped, new AI job submissions return 503 with a user-facing unavailable message" | Worker sets `circuit-breaker:openai` after repeated 429s; API middleware checks the key before enqueueing AI jobs | Point Worker to the local 429 stub, wait for the breaker to trip, then submit a fresh AI job → expect 503 | api/src/index.js — `aiCircuitBreaker`; Worker sets the key during repeated 429s | [evidence/index.json](../evidence/index.json) · `tests/redbar/ai-002-circuit-breaker.test.mjs` |
| * "Queued AI work and cached job status use separate Redis key namespaces on the shared hosted Redis instance" | API/Worker use `queue:jobs` for pending work and `job:{id}` for cached job status | Stop Worker, enqueue summary job, confirm `queue:jobs` entry exists; restart Worker, wait for `done`, then confirm `job:{id}` cache exists | api/src/index.js; worker/index.js | [evidence/index.json](../evidence/index.json) · `tests/redbar/ai-003-queue-cache-separation.test.mjs`; [docs/design_choices.md](design_choices.md) |

Claim: "ai-001"  
Naive control: Immediately mark 429 jobs failed.  
What could go wrong: Transient provider rate limits become permanent user-visible failures.  
What changed: The shipped implementation uses in-process exponential delay + requeue, not a Redis delay-key scheduler. The resilience goal stayed the same even though the mechanism changed.

Claim: "ai-002"  
Naive control: Keep accepting new AI jobs during a sustained upstream outage.  
What could go wrong: Queue growth continues while every job is doomed to fail.  
The catch test: Force repeated 429s against the Worker, require multiple stub hits plus exhausted retries, then require the breaker key to appear and a fresh AI job to receive 503.

## CI/CD and Deployment

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| * "The configured local pre-commit path and StudyFlow-only pull-request path both run lint/test gates before normal commit or merge" | Local pre-commit hook runs repo/package checks; StudyFlow-only remote uses PR checks + Terraform plan | Break lint/test → the normal commit or merge path must fail | githooks; package scripts; StudyFlow workflows | `evidence/receipts/cicd-001-hooks.png`; `evidence/receipts/cicd-001-pipeline.png`; [evidence/index.json](../evidence/index.json) |
| * "Production deploys via GitHub Actions with UI approval gate" | Workflows build/push/deploy to ECS Fargate; protected environment / manual approval in GitHub before apply | Deployment run shows approval step in UI | StudyFlow GitHub workflows | `evidence/receipts/cicd-002-automation-cicd-003-manual-step.png` |
| * "Docker images are scanned for known vulnerabilities before deployment" | GHA pushes to ECR; `scan_on_push` in Terraform; maintainer reviews ECR scan before apply | Terraform asserts `scan_on_push`; receipt shows scan UI | [build-images.yml](../../.github/workflows/build-images.yml); [modules/ecr/main.tf](../../terraform/modules/ecr/main.tf) | `evidence/receipts/cicd-003-ecr-scan.png`; `tests/redbar/cicd-003-ecr-scan.test.mjs` |

Claim: "cicd-003"  
What changed: The shipped process relies on native ECR scanning plus human review before apply, not a mandatory Trivy step in every build workflow. The claim and evidence now match that operational reality.

## Operational

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| * "ALB health checks use /health endpoint" | API exposes `/health`; ALB target group points at `/health` | `GET /health` returns `{ ok: true }`; Terraform health check path is `/health` | api/src/index.js; Terraform ALB module | [evidence/index.json](../evidence/index.json) · `tests/redbar/ops-001-health.test.mjs` |
| * "Logs retained in CloudWatch for 30 days" | ECS `awslogs` + production `log_retention_days = 30` in Terraform | Inspect committed ECS log shipping config and live receipt → tasks must use `awslogs` and retention must be 30 days | Terraform ECS module; CloudWatch log groups | `evidence/receipts/ops-002-retention.png`; `tests/redbar/ops-002-cloudwatch-terraform.test.mjs` |
| * "Queued jobs still in Redis are processed after Worker recovery" | Jobs are stored in Redis; Worker resumes with `brPop`; restart mechanism brings the Worker back | Enqueue jobs → stop Worker → restart Worker → remaining queued jobs must complete | Worker queue loop + hosted Redis | [evidence/index.json](../evidence/index.json) · `tests/redbar/ops-003-worker-recovery.test.mjs` |
| * "Failed AI jobs don't block later jobs in the queue" | Worker marks bad jobs failed and continues its loop | Queue a bad job, then a second job → second job must still reach a terminal state | worker/index.js — main loop | [evidence/index.json](../evidence/index.json) · `tests/redbar/ops-004-failed-job-continues-queue.test.mjs` |

Claim: "ops-003"  
What changed: The claim is now explicitly about **worker recovery behavior**, not about proving provider-side Redis durability guarantees.
