# Red-bar tests

Each **claim ID** has **one** `tests/redbar/<claim>-*.test.mjs` file. Shared live setup is in [live-setup.mjs](live-setup.mjs); helpers live under [../helpers/](../helpers/).

## Rules

- **StudyFlow is the source of truth** — Prefer **live** Docker Compose (API + worker + Mongo + Redis) and real HTTP. Do not duplicate product logic in tests as the only proof (removing enforcement in `api` or `worker` should break tests).
- **Mocks** — External systems only (e.g. local HTTP **429 stub** for OpenAI). See [../helpers/openai-stub-429.mjs](../helpers/openai-stub-429.mjs).
- **Live stack** — [../helpers/redbar-live.mjs](../helpers/redbar-live.mjs) (Auth0 M2M, `API_BASE`, Mongo, Redis). Call **`GET /api/me`** before enqueueing worker jobs so a `users` row exists for the token `sub` (worker skips jobs when the user is missing).

## Claim files

- **rate-002** — Live oversized note → failed AI job with worker error `"Note too large to summarize"`. Complementary UX: [frontend/src/lib/validation.ts](../../frontend/src/lib/validation.ts).
- **ai-001** — [ai-001-backoff.test.mjs](ai-001-backoff.test.mjs): live worker + local HTTP **429** stub on port **19723**. Run with `REDBAR_RUN_AI001_STUB=1 node --test tests/redbar/ai-001-backoff.test.mjs`. The worker must use the stub URL: set `OPENAI_BASE_URL=http://host.docker.internal:19723/v1` in **`.env`** (Compose reads it for `${OPENAI_BASE_URL}`) or `export` it on the host before `docker compose up -d worker` — `worker/.env` alone is not enough because `docker-compose.yml` passes `OPENAI_BASE_URL=${OPENAI_BASE_URL:-}` from the host. The test starts the stub; `extra_hosts` for `host.docker.internal` is in [docker-compose.yml](../../docker-compose.yml). It now proves backoff/requeue by requiring multiple stub hits and exhausted persisted retries before terminal failure. Otherwise the test **skips** so default `npm test` still passes.
- **ai-002** — [ai-002-circuit-breaker.test.mjs](ai-002-circuit-breaker.test.mjs): same **429** stub setup as `ai-001`, but proves the Worker trips `circuit-breaker:openai` and the API then returns **503** for fresh AI work.
- **ai-003** — [ai-003-queue-cache-separation.test.mjs](ai-003-queue-cache-separation.test.mjs): stop Worker, enqueue summary work, confirm payload appears in `queue:jobs`, restart Worker, then confirm completed job status is cached separately at `job:{id}`.
- **auth-005** — [auth-005-material-isolation.test.mjs](auth-005-material-isolation.test.mjs): live direct reads across `/api/materials/:id`, `/api/materials/:id/note`, `/api/topics/:id/materials`, `/api/materials/:id/flashcard-set`, and `/api/flashcard-sets/:id/cards`; plus `POST /api/notes` and `POST /api/flashcard-sets` with an inaccessible `topicId` → 403.
- **auth-006** — [auth-006-job-owner.test.mjs](auth-006-job-owner.test.mjs): `GET /api/jobs/:id` returns 403 for another user's job and 200 for the caller's job.
- **gov-002** — [gov-002-ai-ownership.test.mjs](gov-002-ai-ownership.test.mjs): unauthorized `POST .../flashcards` and `.../summary` both return 403 and create no job.
- **gov-003** — [gov-003-flashcard-materialid.test.mjs](gov-003-flashcard-materialid.test.mjs): live summary generation, then Mongo query asserting the summary material stores `derivedFrom` pointing to the source note material.
- **Infra** — `res-001-terraform-region.test.mjs`, `cicd-003-ecr-scan.test.mjs`, `ops-002-cloudwatch-terraform.test.mjs` read `terraform/`.
- **data-003** — [data-003-secrets-scan.test.mjs](data-003-secrets-scan.test.mjs) — tracked-source `git grep` heuristic + `.env` ignore/hook checks.
- **data-004** — [data-004-worker-secret-isolation.test.mjs](data-004-worker-secret-isolation.test.mjs) — Terraform ECS task-definition check for `OPENAI_API_KEY` isolation plus a scan of the frontend client source tree for forbidden references.
- **data-005** — [data-005-account-deletion.test.mjs](data-005-account-deletion.test.mjs) — live account deletion after seeding all claimed MongoDB + Redis artifacts, then verifying the full cascade.
- **ops-003** — [ops-003-worker-recovery.test.mjs](ops-003-worker-recovery.test.mjs): stop Worker with Docker Compose, enqueue jobs, restart Worker, and verify queued jobs still reach terminal state.
- **ops-002** — [ops-002-cloudwatch-terraform.test.mjs](ops-002-cloudwatch-terraform.test.mjs): Terraform must keep ECS `awslogs` shipping plus `log_retention_days = 30`.
- **gov-005** — [gov-005-membership-audit.test.mjs](gov-005-membership-audit.test.mjs): group create, add, remove, join, leave, and owner `PUT` with `memberIds` all produce `groupAuditLog` entries with the required fields.
- **ops-004** — [ops-004-failed-job-continues-queue.test.mjs](ops-004-failed-job-continues-queue.test.mjs): live worker queue progression after an intentionally broken job fails.

```bash
npm run test:redbar
node --test tests/redbar/auth-001-jwt-required.test.mjs
```

See [docs/redbar_expected_failure.md](../../docs/redbar_expected_failure.md) for the full mapping.
