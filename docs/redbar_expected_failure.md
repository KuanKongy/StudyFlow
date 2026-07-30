# Red-bar tests — claim mapping

Red-bar tests are organized so that **removing enforcement code** in StudyFlow or Terraform (or breaking the live API) causes failures or skips where appropriate. Each claim has a **dedicated** file under `tests/redbar/`.

| Claim | Test file | How it binds to code |
| --- | --- | --- |
| auth-001 | [auth-001-jwt-required.test.mjs](../tests/redbar/auth-001-jwt-required.test.mjs) | HTTP 401 without `Authorization` |
| auth-002 | [auth-002-owner-delete.test.mjs](../tests/redbar/auth-002-owner-delete.test.mjs) | Seeded Mongo group + `DELETE /api/groups/:id`; owner delete via API |
| auth-003 | [auth-003-owner-remove.test.mjs](../tests/redbar/auth-003-owner-remove.test.mjs) | Non-owner cannot add another user or remove others; non-owner `POST` self on public group → 200; private self-`POST` → 403 |
| auth-004 | [auth-004-topic-isolation.test.mjs](../tests/redbar/auth-004-topic-isolation.test.mjs) | Hidden topic omitted from `GET /api/topics`; non-owner `PUT /api/topics/:id` → 403 |
| auth-005 / gov-001 | [auth-005-material-isolation.test.mjs](../tests/redbar/auth-005-material-isolation.test.mjs) | Inaccessible reads return 403; `POST /api/notes` and `POST /api/flashcard-sets` with foreign `topicId` → 403 |
| auth-006 | [auth-006-job-owner.test.mjs](../tests/redbar/auth-006-job-owner.test.mjs) | Foreign-owned job id on `GET /api/jobs/:id` → 403; own job → 200 |
| gov-002 | [gov-002-ai-ownership.test.mjs](../tests/redbar/gov-002-ai-ownership.test.mjs) | `POST .../flashcards` and `.../summary` on inaccessible material both return 403 and create no job |
| gov-003 | [gov-003-flashcard-materialid.test.mjs](../tests/redbar/gov-003-flashcard-materialid.test.mjs) | Live summary job + Mongo `studyMaterials.derivedFrom` |
| gov-004 | [gov-004-note-delete.test.mjs](../tests/redbar/gov-004-note-delete.test.mjs) | `DELETE /api/materials/:id/note`, derived-summary cleanup, and `topic:{topicId}:materials` cache invalidation |
| gov-005 | [gov-005-membership-audit.test.mjs](../tests/redbar/gov-005-membership-audit.test.mjs) | `POST /api/groups` (create audit), `POST`/`DELETE` members, join, leave, owner `PUT` memberIds → `groupAuditLog` entries |
| rate-001 | [rate-001-ai-rate-limit.test.mjs](../tests/redbar/rate-001-ai-rate-limit.test.mjs) | Eleventh AI POST returns 429 |
| rate-002 | [rate-002-note-size.test.mjs](../tests/redbar/rate-002-note-size.test.mjs) | Live: oversized note → AI job **failed** with worker error (see [validation.ts](../frontend/src/lib/validation.ts) for UX) |
| ai-001 | [ai-001-backoff.test.mjs](../tests/redbar/ai-001-backoff.test.mjs) | Live worker + HTTP 429 stub; verifies multiple upstream hits and exhausted retries before failure |
| ai-002 | [ai-002-circuit-breaker.test.mjs](../tests/redbar/ai-002-circuit-breaker.test.mjs) | Worker hits repeated 429s, sets `circuit-breaker:openai`, then fresh AI POST returns 503 |
| ai-003 | [ai-003-queue-cache-separation.test.mjs](../tests/redbar/ai-003-queue-cache-separation.test.mjs) | Stop Worker, queued payload appears in `queue:jobs`; after completion, cached status appears in `job:{id}` |
| data-003 | [data-003-secrets-scan.test.mjs](../tests/redbar/data-003-secrets-scan.test.mjs) | `git grep` heuristic + `.env` guard checks for tracked source |
| data-004 | [data-004-worker-secret-isolation.test.mjs](../tests/redbar/data-004-worker-secret-isolation.test.mjs) | ECS task definitions isolate `OPENAI_API_KEY` to Worker and frontend source does not reference it |
| data-005 | [data-005-account-deletion.test.mjs](../tests/redbar/data-005-account-deletion.test.mjs) | `DELETE /api/account` + seeded Mongo/Redis artifacts must all disappear |
| res-001 | [res-001-terraform-region.test.mjs](../tests/redbar/res-001-terraform-region.test.mjs) | Production `config.tfvars` + provider wiring for `ca-central-1` |
| cicd-003 | [cicd-003-ecr-scan.test.mjs](../tests/redbar/cicd-003-ecr-scan.test.mjs) | ECR `scan_on_push` in Terraform |
| ops-002 | [ops-002-cloudwatch-terraform.test.mjs](../tests/redbar/ops-002-cloudwatch-terraform.test.mjs) | ECS `awslogs` wiring plus production `log_retention_days = 30` |
| ops-001 | [ops-001-health.test.mjs](../tests/redbar/ops-001-health.test.mjs) | `GET /health` plus ALB Terraform path `/health` |
| ops-003 | [ops-003-worker-recovery.test.mjs](../tests/redbar/ops-003-worker-recovery.test.mjs) | Stop Worker, enqueue jobs, restart Worker, queued jobs still complete |
| ops-004 | [ops-004-failed-job-continues-queue.test.mjs](../tests/redbar/ops-004-failed-job-continues-queue.test.mjs) | Broken queued job fails, later queued job still reaches terminal state |

Full suite: `npm test` (includes smoke + integration when network and stack are available).
