# Claims List

List the claims you intend to prove. Each claim should link to a CCT entry and evidence block.  
Link for the implementation: current MVP (see [KuanKongy/StudyFlow](https://github.com/KuanKongy/StudyFlow))

This file is the **authoritative summary of what is actually claimed** for the current StudyFlow implementation. [evidence_plan.md](evidence_plan.md) was used as a drafting worksheet for possible proof strategies; where the two differ, this file reflects the current, intended claim wording. In each claim's `Notes`, changes from earlier drafts or the original proposal are called out explicitly so the pack remains auditable.

**How tests map to this repo:** Automated **red-bar and smoke tests live at the repository root** (`package.json` → `npm test`). **Red-bar** tests use **one file per claim** under `tests/redbar/<claim>-*.test.mjs` (see [tests/redbar/README.md](../tests/redbar/README.md)). They exercise enforcement via **HTTP**, **seeded MongoDB**, **Redis**, **Terraform file reads**, or **test-local** mocks—**not** by importing extracted modules from the service packages. **Live** tests call the running API (Docker Compose + Auth0 M2M); if the stack is down they skip. `api` and `worker` keep minimal `npm test` stubs; **root tests are the integration test suite** for application correctness. A passing `npm test` run is evidence for the **claims backed by automated tests**, **except** `ai-001` and `ai-002`, which intentionally require a **separate stub-backed Worker run** (`REDBAR_RUN_AI001_STUB=1` with Worker `OPENAI_BASE_URL` pointed at the local 429 stub) to avoid real OpenAI spend while still proving the live retry/breaker behavior. [scripts/run-tests-with-log.mjs](../scripts/run-tests-with-log.mjs) writes the receipt log for those test runs to `evidence/receipts/npm-test-*.log` with the command, output, timestamp, and commit hash. Claims backed by manual receipts still require those linked artifacts. **ESLint** runs at the root (`npm run lint`) and in each service package. **Before every commit**, [githooks/pre-commit](../githooks/pre-commit) runs root lint + tests and now rejects staged `.env` files. For a **reproducible** API/Redis/Mongo stack for integration tests, use [docker-compose.yml](../docker-compose.yml) (`docker compose up` at the repo root). Deploy/PR automation lives under [.github/workflows/](../.github/workflows/). **AWS shape** is defined in [terraform/](../terraform/) (see [design_choices.md](design_choices.md) for notes on where the shipped stack diverged from the original proposal).

## Authentication and Authorization

**Claim ID: "auth-001"**  
Clause: "All API endpoints under /api/* require a valid Auth0 JWT. Requests without a valid token receive 401 Unauthorized."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `app.use("/api", checkJwt)`  
Evidence link: automated: `node --test tests/redbar/auth-001-jwt-required.test.mjs` — recorded in [evidence/index.json](../evidence/index.json).  
Notes: Blanket Auth0 JWT enforcement at the `/api` route prefix. No change from the original security intent.  

**Claim ID: "auth-002"**  
Clause: "Only the owner of a group can delete that group."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `DELETE /api/groups/:id` — returns 403 if `group.ownerId !== req.auth.payload.sub`.  
Evidence link: automated: `tests/redbar/auth-002-owner-delete.test.mjs`.  
Notes: Ownership check is implemented server-side. Red-bar test fails if the check is removed.  

**Claim ID: "auth-003"**  
Clause: "Only the group owner may add another user or remove a member; a non-owner may self-join only a **public** group (no join code) via `POST /api/groups/:id/members` with their own user id (Join Group page); private groups require `POST /api/groups/join` with a code. Self-leave and owner-driven removal follow `DELETE` / leave routes as implemented."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `POST /api/groups/:id/members` (owner adds any user; non-owner only self + public); `DELETE /api/groups/:id/members` — non-owner removal forbidden except self where applicable.  
Evidence link: automated: `tests/redbar/auth-003-owner-remove.test.mjs`.  
Notes: Matches [JoinGroup.tsx](../frontend/src/pages/JoinGroup.tsx) public join (`addMember` self). Audit logging for membership is in `gov-005`.  

**Claim ID: "auth-004"**  
Clause: "A user can only list topics they own (personal) or that belong to groups they are a member of; only the topic owner may update topic metadata via `PUT`."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `GET /api/topics` — query filters by `ownerId` and group membership; `PUT /api/topics/:id` — returns 403 if `topic.ownerId !== req.auth.payload.sub` (owner id cannot be changed via this route).  
Evidence link: automated: `tests/redbar/auth-004-topic-isolation.test.mjs`.  
Notes: List isolation and topic-owner update enforcement are both covered by the red-bar file.  

**Claim ID: "auth-005"**  
Clause: "A user can only access materials (notes, flashcards, summaries) belonging to topics they have access to, including when creating notes or flashcard sets in a topic."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `canAccessMaterial()` on material routes; `canAccessTopic()` for `POST /api/notes` and `POST /api/flashcard-sets` when a `topicId` is supplied.  
Evidence link: automated: `tests/redbar/auth-005-material-isolation.test.mjs`.  
Notes: Isolation is enforced server-side across reads, topic-material listings, flashcard-set/card reads, and note/flashcard-set creation scoped to a topic.  

**Claim ID: "auth-006"**  
Clause: "A user can only read AI job status for jobs they own (`GET /api/jobs/:id`)."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `GET /api/jobs/:id` returns 403 if `job.ownerId !== req.auth.payload.sub`.  
Evidence link: automated: `tests/redbar/auth-006-job-owner.test.mjs`.  
Notes: Job document ownership is checked before returning cached or persisted status.  

## Data Protection

**Claim ID: "data-001"**  
Clause: "All user notes and AI-generated content are encrypted at rest using AES-256 via MongoDB Atlas Transparent Data Encryption (TDE)."  
Enforcement point: MongoDB Atlas cluster configuration.  
Evidence link: evidence/receipts/data-001-encryption.png (MongoDB Atlas default encryption at rest), evidence/receipts/data-001-aes-256.png (what encryption os default = aes 256)  
Notes: **Changed from earlier draft:** dropped the CMK requirement. The shipped stack relies on Atlas default encryption at rest, which is the control actually in use. [design_choices.md](design_choices.md) explains why this differs from the stronger original plan.  

**Claim ID: "data-002"**  
Clause: "All connections between ECS services and MongoDB/Redis use TLS encryption in transit."  
Enforcement point: `mongodb+srv://` URI (TLS); Redis URL `rediss://` from provider (e.g. Upstash TLS).  
Evidence link:evidence/receipts/data-002-mongo-secret.png (MongoDB connection string with mongodb+srv:// in AWS), evidence/receipts/data-002-mongo-tls.png (MongoDB connection string with mongodb+srv:// in Atlas), evidence/receipts/data-002-redis-secret.png (Redis URL with rediss:// in AWS), evidence/receipts/data-002-redis-tls.png (Redis URL with rediss:// in Upstash with TLS enabled sign)  
Notes: **Updated:** Atlas and hosted Redis providers such as Upstash require or default to TLS, so the live connection URLs and provider settings are the relevant proof rather than an AWS-managed ElastiCache parameter group.  

**Claim ID: "data-003"**  
Clause: "Tracked source files are checked for obvious secret literals; `.env` files are gitignored and blocked at pre-commit; production runtime secrets are supplied separately via Secrets Manager."  
Enforcement point: `.gitignore` for `.env`; pre-commit hook rejects staged `.env` files; production uses Secrets Manager ARNs in ECS task definitions ([terraform/](../terraform/)).  
Evidence link: evidence/receipts/data-003-github-secrets.png (list of all secrets in GitHub, same as in terraform/MANUAL_SETUP_TFC_GHA.md, no more than that or less), evidence/receipts/data-003-secret-manager.png (list of all secrets in AWS Secrets Manager, same as in terraform/MANUAL_SETUP_TFC_GHA.md, no more than that or less); automated: `tests/redbar/data-003-secrets-scan.test.mjs`.  
Notes: **Changed:** verification is now explicitly scoped to what the repo enforces and tests: obvious secret-literal scans, `.env` ignore rules, and the hook guard against committing `.env` files. Runtime production secrets still come from Secrets Manager.  

**Claim ID: "data-004"**  
Clause: "The `OPENAI_API_KEY` is not injected into the API ECS task or frontend client source tree. Only the Worker service receives it."  
Enforcement point: Worker task definition injects `OPENAI_API_KEY`; API task definition does not; frontend client source tree does not reference `OPENAI_API_KEY` ([terraform/modules/ecs/](../terraform/modules/ecs/), [frontend/src/](../frontend/src/)).  
Evidence link: automated: `tests/redbar/data-004-worker-secret-isolation.test.mjs`.  
Notes: **Evidence is repo-local:** the red-bar test reads committed Terraform ECS task definitions and scans the frontend source tree. It does not call the live AWS ECS API; a separate optional receipt can show the deployed task definition if needed.  

**Claim ID: "data-005"**  
Clause: "Deleting an account removes all user-authored content and derived AI artifacts stored by StudyFlow, and purges Redis cache entries and queued job payloads for that user."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `DELETE /api/account`; [worker/index.js](../worker/index.js) — guard before OpenAI if user deleted.  
Evidence link: automated: `tests/redbar/data-005-account-deletion.test.mjs`.  
Notes: **Changed from earlier draft:** Auth0 identity deletion is no longer claimed. The user record in Auth0 is intentionally left in place so a returning user can sign back in without redoing onboarding, while all StudyFlow-managed data is deleted. The red-bar test now seeds every MongoDB and Redis artifact named in the claim and fails if any survive the deletion cascade.  

## Rate Limiting

**Claim ID: "rate-001"**  
Clause: "Each user is limited to 10 AI job requests (summaries + flashcards combined) per hour."  
Enforcement point: [api/src/index.js](../api/src/index.js) — Redis key `rate:{userId}:ai` + `aiRateLimiter` middleware on AI job routes.  
Evidence link: automated: `tests/redbar/rate-001-ai-rate-limit.test.mjs`.  
Notes: Implemented with Redis so counts are shared across API instances.  

**Claim ID: "rate-002"**  
Clause: "Note content sent to OpenAI is capped at 50,000 characters. Notes exceeding this limit are rejected with a failed job and error."  
Enforcement point: [worker/index.js](../worker/index.js) — pre-OpenAI size check.  
Evidence link: automated: `tests/redbar/rate-002-note-size.test.mjs`; complementary UX cap in [frontend/src/lib/validation.ts](../frontend/src/lib/validation.ts).  
Notes: **Changed:** wording is now tied to the actual worker behavior instead of overcommitting to one exact error-string context.  

## Data Residency

**Claim ID: "res-001"**  
Clause: "The production AWS infrastructure is configured for `ca-central-1`, and the deployed MongoDB Atlas and Redis instances are configured in `ca-central-1` as well."  
Enforcement point: [terraform/config.tfvars](../terraform/config.tfvars) and [terraform/providers.tf](../terraform/providers.tf) for AWS; Atlas and Redis deployment settings for managed data stores.  
Evidence link: evidence/receipts/res-001-mongo.png (MongoDB inn ca-cental-1 config), evidence/receipts/res-001-redis.png (Redis in ca-cental-1 config); automated: `tests/redbar/res-001-terraform-region.test.mjs`.  
Notes: **Changed:** this claim no longer relies on Terraform defaults alone. The committed production `config.tfvars` and provider wiring reflect the actual AWS region, while Atlas/Redis region screenshots provide the non-Terraform evidence. CloudFront still requires a certificate in `us-east-1`; OpenAI processing remains an external residency exception covered by `res-002`.  

**Claim ID: "res-002"**  
Clause: "Student note content is transmitted to OpenAI's API for AI processing, which may process data outside Canada. This transit is disclosed to users before AI use."  
Enforcement point: [frontend/src/pages/NoteView.tsx](../frontend/src/pages/NoteView.tsx) — disclosure before AI action; Worker calls OpenAI.  
Evidence link: evidence/receipts/res-002-modal.png (Modal with US warning)  
Notes: Honest disclosure, not a residency guarantee. The disclosure also appears in the legal documents under [legal/](../legal). AI actions on the note view use the same disclosure component, so one modal capture is representative.  

**Claim ID: "res-003"**  
Clause: "OpenAI is the current AI provider; AWS Bedrock (ca-central-1) is the documented migration target if data residency requirements change."  
Enforcement point: [docs/design_choices.md](docs/design_choices.md) — AI provider evaluation section.  
Evidence link: use **design_choices.md** as the auditable rationale; optional separate artifact if needed.  
Notes: Keeps the provider rationale visible for reviewers without duplicating a second canonical document.  

## Access Control (Governance)

**Claim ID: "gov-001"**  
Clause: "Group members cannot view personal notes belonging to other users, even if they possess the material ID."  
Enforcement point: Same as auth-005 — `canAccessMaterial()` / material routes for note content.  
Evidence link: automated: `tests/redbar/auth-005-material-isolation.test.mjs`.  
Notes: Enforced with the same material-access checks as `auth-005`.  

**Claim ID: "gov-002"**  
Clause: "AI processing (summary/flashcard generation) only triggers if the requesting user has access to the source note (owns it, or is a member of a group that shares the note's topic)."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `canAccessMaterial()` on `POST .../flashcards` and `.../summary`.  
Evidence link: automated: `tests/redbar/gov-002-ai-ownership.test.mjs`.  
Notes: Generated job ownership is tied to the requesting user, but access is checked against the source note before enqueueing on **both** summary and flashcard routes.  

**Claim ID: "gov-003"**  
Clause: "AI-generated summaries store a metadata reference linking back to the source note's material ID."  
Enforcement point: [worker/index.js](../worker/index.js) — summary `StudyMaterials` use `derivedFrom`.  
Evidence link: automated: `tests/redbar/gov-003-flashcard-materialid.test.mjs`.  
Notes: **Changed:** this claim was originally misstated as a flashcard provenance claim. The current implementation actually stores provenance for **summaries** via `derivedFrom`, so the claim and test were updated to match the real behavior.  

**Claim ID: "gov-004"**  
Clause: "When a user deletes a note, the corresponding studyMaterial record and note content are removed, derived summaries are removed, and related caches are invalidated."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `DELETE /api/materials/:id/note`.  
Evidence link: automated: `tests/redbar/gov-004-note-delete.test.mjs`.  
Notes: **Changed:** flashcards are deliberately **not** deleted when the source note is deleted. This is a product choice: summaries are explanatory views of the source note and become misleading without it, while flashcards are treated as retained knowledge artifacts in their own right. The proof also checks that the topic-materials cache key is invalidated. [design_choices.md](design_choices.md) documents this deviation from the original assumption of full derived-artifact cascade on note deletion.  

**Claim ID: "gov-005"**  
Clause: "All group membership changes are logged with actor, target, groupId, action, and timestamp."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `POST /api/groups` (create), `POST`/`DELETE` members, join, leave, and owner-only `PUT /api/groups/:id` when `memberIds` changes (per-member add/remove audit rows).  
Evidence link: automated: `tests/redbar/gov-005-membership-audit.test.mjs`.  
Notes: Group creation logs `action: "create"`. Owner-only `PUT` with an updated `memberIds` array emits add/remove audits consistent with the dedicated member routes.  

## CI/CD and Deployment

**Claim ID: "cicd-001"**  
Clause: "The configured local pre-commit path and the StudyFlow-only pull-request path both run lint checks and automated tests before a normal commit or merge proceeds."  
Enforcement point: **Monorepo (this checkout):** [githooks/pre-commit](../githooks/pre-commit) runs `npm run lint` + `npm test` at the repo root and package-level checks. **StudyFlow-only repo checkout:** [.github/workflows/pr-checks.yml](../.github/workflows/pr-checks.yml) runs API/worker lint and Terraform plan.  
Evidence link: evidence/receipts/cicd-001-pipeline.png (picture of pr-checks run in StudyFlow repo), evidence/receipts/cicd-001-hooks.png (picture of hook rejecting commit)  
Notes: **Changed:** the wording now matches the shipped process and avoids overclaiming an absolute production guarantee. Local pre-commit is the primary gate in this monorepo; the StudyFlow-only remote has PR checks, but the repo root itself does not have a single monolithic CI workflow.  

**Claim ID: "cicd-002"**  
Clause: "Production deployments are driven through GitHub Actions and deploy to ECS Fargate; production applies use an explicit approval step in the GitHub UI (environment / workflow gate) rather than unchecked push-to-prod."  
Enforcement point: [.github/workflows/main-branch.yml](../.github/workflows/main-branch.yml) → [build-images.yml](../.github/workflows/build-images.yml), [deploy-frontend.yml](../.github/workflows/deploy-frontend.yml), [deploy-terraform.yml](../.github/workflows/deploy-terraform.yml).  
Evidence link: evidence/receipts/cicd-002-automation-cicd-003-manual-step.png (deployment github actions run with manual review accepted via click in github UI)  
Notes: **Changed from proposal wording:** deployment is automated, but production apply is intentionally run through an explicit workflow/environment gate rather than an unconditional push-to-prod pipeline.  

**Claim ID: "cicd-003"**  
Clause: "Docker images are scanned for known vulnerabilities before deployment."  
Enforcement point: ECR `scan_on_push` in [terraform/modules/ecr/main.tf](../terraform/modules/ecr/main.tf); images built and pushed in [.github/workflows/build-images.yml](../.github/workflows/build-images.yml).  
Evidence link: evidence/receipts/cicd-002-automation-cicd-003-manual-step.png (deployment github actions run with manual review accepted via click in github UI), evidence/receipts/cicd-003-ecr-scan.png (ECR scan for vulneravilities AWS); automated: `tests/redbar/cicd-003-ecr-scan.test.mjs`.  
Notes: **Flow:** CI builds and pushes images to ECR; Terraform enables `scan_on_push` on those repositories. After push, AWS ECR runs the scan. The release process includes reviewing scan results in the AWS console (screenshot) and approving the deploy/apply step in GitHub before production changes land—not a Trivy gate in every build workflow.  

## Operational

**Claim ID: "ops-001"**  
Clause: "The API server exposes a /health endpoint that returns { ok: true } and is used by the ALB target group health check."  
Enforcement point: [api/src/index.js](../api/src/index.js) — `GET /health`; [terraform/modules/alb/main.tf](../terraform/modules/alb/main.tf) health check path `/health`.  
Evidence link: automated: `tests/redbar/ops-001-health.test.mjs`.  
Notes: Terraform wires ALB to `/health`, and the proof checks both the API response and the ALB target-group path.  

**Claim ID: "ops-002"**  
Clause: "Application logs from API and Worker containers are shipped to CloudWatch Logs and retained for 30 days."  
Enforcement point: [terraform/modules/ecs/main.tf](../terraform/modules/ecs/main.tf) — `awslogs` + `log_retention_days`.  
Evidence link: evidence/receipts/ops-002-retention.png (CloudWatch logs with retention plan); automated: `tests/redbar/ops-002-cloudwatch-terraform.test.mjs`.  
Notes: Defined in Terraform via ECS `awslogs` configuration and pinned to `30` days in production config, with a matching CloudWatch receipt.  

**Claim ID: "ops-003"**  
Clause: "If the Worker service crashes or stops processing jobs, queued jobs that remain in Redis are processed when the Worker recovers."  
Enforcement point: Redis list `queue:jobs`; Worker `brPop`; local Docker/ECS worker restart behavior.  
Evidence link: automated: `tests/redbar/ops-003-worker-recovery.test.mjs`.  
Notes: **Changed:** this claim is about worker recovery and continued processing, not a blanket guarantee of provider-side Redis durability. With Upstash, persistence characteristics remain provider-dependent. The red-bar test stops and restarts the Worker to prove queued jobs continue after recovery.  

**Claim ID: "ops-004"**  
Clause: "Failed AI jobs are marked with status failed and include an error message. They do not block later jobs in the queue."  
Enforcement point: [worker/index.js](../worker/index.js) — main loop catch/continue behavior.  
Evidence link: automated: `tests/redbar/ops-004-failed-job-continues-queue.test.mjs`.  
Notes: **Changed:** added a dedicated red-bar test for queue progression after a failed job.  

## AI Resilience & Redis

**Claim ID: "ai-001"**  
Clause: "OpenAI 429 responses trigger exponential backoff and job re-queuing, not immediate failure."  
Enforcement point: [worker/index.js](../worker/index.js) — 429 handling in `callOpenAI()`.  
Evidence link: automated: `tests/redbar/ai-001-backoff.test.mjs`.  
Notes: **Changed:** the implementation uses **in-process exponential delay plus requeue**, not a Redis TTL/delay-key mechanism. The proof checks that the worker makes repeated upstream calls and records exhausted retries before terminal failure. The design choice section explains why the shipped mechanism differs from the earlier sketch while preserving the same resilience goal.  

**Claim ID: "ai-002"**  
Clause: "When the AI circuit breaker is tripped, new AI job submissions return 503 with a user-facing unavailable message."  
Enforcement point: [worker/index.js](../worker/index.js) sets `circuit-breaker:openai`; [api/src/index.js](../api/src/index.js) checks it via `aiCircuitBreaker`.  
Evidence link: automated: `tests/redbar/ai-002-circuit-breaker.test.mjs`.  
Notes: **Changed:** claim wording is centered on the enforced API behavior, and the red-bar test now proves the full path: repeated OpenAI 429s trip the Worker-side breaker key, then the API rejects fresh AI work with 503.  

**Claim ID: "ai-003"**  
Clause: "Queued AI work and cached job status use separate Redis key namespaces on the shared hosted Redis instance."  
Enforcement point: [api/src/index.js](../api/src/index.js) — AI routes push job payloads to `queue:jobs` and `GET /api/jobs/:id` caches status in `job:{id}`; [worker/index.js](../worker/index.js) — `brPop("queue:jobs")` consumes queued work and successful jobs set `job:{id}`.  
Evidence link: automated: `tests/redbar/ai-003-queue-cache-separation.test.mjs`.  
Notes: **Changed from original ElastiCache-style plan:** the shipped stack uses one hosted Redis with prefix-based logical separation rather than separate policy-tuned Redis classes. The claim is now tied to the exact namespaces the code actually uses (`queue:jobs` for pending work and `job:{id}` for cached job status), making it concrete and red-bar testable. [design_choices.md](design_choices.md) documents this deviation and its limits honestly.  
