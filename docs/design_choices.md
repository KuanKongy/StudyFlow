# Design Choices

This document records the rationale behind key architecture and technology decisions in StudyFlow. It was created in response to design review feedback to make implicit choices explicit and auditable.

Each section maps to a feedback question. Where a choice resulted in a new CCT clause, the claim ID is noted.

## 1. Why MongoDB over DynamoDB?

**Short answer:** The data model is document-shaped, the MVP already uses MongoDB, and DynamoDB's access-pattern-first design would have required a full rewrite of the data layer for no functional gain at capstone scale.

**Longer reasoning:**

StudyFlow's core entities — notes, flashcard sets (which contain nested flashcard arrays), and study materials (which have varying schemas by type) — are naturally document-shaped with no relational joins. The access patterns are:

- "Get all materials by `ownerId`"
- "Get topics where `groupId` is in [list of user's group IDs]"
- "Get flashcard set by `materialId`"

These are all simple index queries in MongoDB. In DynamoDB, each non-primary-key access pattern requires a Global Secondary Index (GSI). GSIs add write overhead (every write fans out to each GSI), add cost, and the partition key + sort key decisions are permanent — changing them later requires a full data migration.

The MVP was already using MongoDB. Switching to DynamoDB would have required rewriting every data access call in the codebase (different SDK, different query language, different error handling) — significant risk and scope creep for the capstone, which is focused on deployment and production hardening, not rewriting working business logic.

**Where DynamoDB would have won:** Serverless auto-scaling. DynamoDB scales to zero and to very high throughput without instance management or cluster tier selection. At real production scale with unpredictable traffic, this matters. At capstone scale with a handful of users, it does not. This is documented as a known limitation in the proposal (single-region, minimal cluster tier).

**MongoDB Atlas specifics that informed the choice:** Atlas provides encryption at rest by default, optional CMK integration via AWS KMS, VPC peering options, and connection string-level TLS enforcement. For the shipped capstone stack, the claim pack now relies on **Atlas default encryption at rest** rather than requiring CMK, because CMK was part of the stronger original plan but was not actually wired into the delivered infrastructure. DynamoDB also supports encryption at rest and VPC endpoints, so this was not a differentiating factor.


## 2. Why S3 + CloudFront for the Frontend?

**Short answer:** The React SPA is static files after `npm run build`. S3 is object storage for files; CloudFront is the CDN layer. This is not a database storage decision — it is a file-serving decision.

**The question of "other database options":** S3 is not being used as an alternative to RDS or DynamoDB. It serves a different purpose: storing the compiled JavaScript, HTML, and CSS bundles that make up the frontend. The alternatives for this specific use case are:

| Option | Reasoning |
| --- | --- |
| Serve from ECS (e.g., nginx container) | Wastes compute resources on static file serving; requires container management; no built-in CDN |
| AWS Amplify Hosting | Opinionated deployment model; less control over build pipeline integration with the existing GitHub Actions workflow |
| EC2 behind Apache/nginx | Unnecessary operational overhead; no CDN layer without additional configuration |
| S3 + CloudFront | S3 stores files cheaply (essentially free at capstone data volumes); CloudFront serves from edge nodes globally with HTTPS via ACM certificate; scales infinitely without configuration |

S3 + CloudFront is the canonical AWS pattern for static site hosting and is the correct tool for the job. The choice requires no further justification beyond "it is what S3 and CloudFront are designed for". Initially, I just wanted it to be hosted on GitHub Pages or Vercel, but wanted to experiment a little.


## 3. Why OpenAI? What Alternatives Were Evaluated?

**Short answer:** OpenAI was used in the MVP and was not re-evaluated for the capstone. This was an implicit default, not a deliberate choice. Upon reflection during design review, the following evaluation was conducted.

**Alternatives evaluated:**

| Provider | Data residency | Rate limits | Cost | Notes |
| --- | --- | --- | --- | --- |
| OpenAI GPT-4o | Note content leaves Canada (US company, CLOUD Act) | Yes — RPM/TPM limits; documented as brittle point | Per-token; predictable | Current choice. Already integrated in MVP. |
| Anthropic Claude | Note content leaves Canada (US company, CLOUD Act) | Yes — similar limits | Per-token; comparable | No improvement on data privacy. Different API but same structural problem. |
| Google Gemini | Note content leaves Canada (US company, CLOUD Act) | Yes | Per-token | No improvement on data privacy. |
| **AWS Bedrock (ca-central-1)** | **Note content stays within AWS ca-central-1** | Managed by AWS account service quotas | Per-token; comparable | **Primary migration target.** Supports Claude 3, Llama 3, Mistral models. Keeps all data within AWS infrastructure — no res-002 disclosure required. No external rate-limit dependency. |
| Self-hosted Llama 3 / Mistral on EC2 | Note content stays in ca-central-1 | No external rate limits | EC2 GPU instance cost (g4dn.xlarge ~$0.526/hr) | Full data sovereignty. Operationally complex: model updates, inference server management, GPU EC2 not available on Fargate. Not feasible within capstone budget. |

**Why OpenAI was kept for this version:** The MVP Worker already has a working OpenAI integration. The capstone scope is deployment and production hardening. Replacing the AI provider mid-capstone adds scope without addressing the primary deliverable.

**Why this matters and what changes:** The data privacy concern (res-002) is real. Student notes leave Canada when sent to OpenAI. The ethics ledger documents this and mitigates it with a user disclosure. However, AWS Bedrock in ca-central-1 would eliminate the residency exception entirely — note content would never leave AWS infrastructure. This is the documented next step if data residency requirements tighten.

**CCT reference:** res-003 in cct_v2.md formalises this evaluation as an auditable record. See also the AI Resilience section (ai-001, ai-002) which addresses the rate-limit brittleness that is unique to external AI providers.


## 4. Which Part of the Architecture is Most Brittle?

**Short answer:** The Worker → OpenAI API link. It is the only constraint that cannot be resolved by adding more infrastructure.

**Failure analysis by component under heavy load:**

| Component | Failure mode | Can you scale out of it? |
| --- | --- | --- |
| API (ECS Fargate, 1-4 tasks) | CPU/memory saturation | Yes — add tasks, ALB distributes load |
| MongoDB Atlas | Write throughput cap on single primary | Partially — Atlas scales connections; at extreme load, sharding required |
| ElastiCache Redis (single node) | Memory exhaustion from queue growth | Partially — upgrade instance tier; separate queue/cache keyspaces (ai-003) |
| Worker (ECS, 1-2 tasks) | Sequential processing bottleneck | Partially — add Worker tasks, but rate limit is per API key, not per Worker |
| **OpenAI API** | **RPM/TPM rate limits → cascade of failed jobs** | **No — rate limit is per API key, shared across all Worker instances** |

**Why OpenAI is uniquely brittle:** Adding a second Worker task does not double AI throughput if OpenAI has already rate-limited the API key. The rate limit is global to the account. Under a burst of concurrent AI requests (a study group of 30 users all triggering flashcard generation before an exam), the Worker receives 429s and the v1 design marks every affected job as `status: "failed"` permanently. Users are left with nothing at the exact moment they need the feature.

**Secondary brittle point:** Redis is a single node that serves both the job queue and the response cache. Under queue pressure (many jobs piling up due to OpenAI rate limiting), Redis memory fills with job metadata. When it hits the memory limit, it begins evicting keys based on its eviction policy — potentially evicting cache entries that the API depends on for topic material reads. This creates a failure mode where rate-limited AI requests degrade the non-AI part of the application.

**Mitigations added in v2:**

- `ai-001`: Exponential backoff with re-queuing on 429 responses — transient rate limits do not permanently fail jobs
- `ai-002`: Circuit breaker — sustained rate limits or outages surface as a clean 503 rather than silently queuing jobs that will all eventually fail
- `ai-003`: Logical separation of queued work and cached status/read data in Redis — this avoids key collisions and makes queue-vs-cache behavior auditable, but it does **not** create hard memory isolation on a shared Redis instance

**Implementation detail that differs from the original sketch:** the shipped `ai-001` mechanism does **not** use a Redis TTL/delay-key scheduler. Instead, the Worker sleeps in-process for an exponentially increasing delay and then re-queues the job. The resilience goal stayed the same, but the mechanism is simpler and matches the current code.

**Long-term mitigation:** AWS Bedrock eliminates the external rate-limit dependency entirely. Bedrock service quotas are managed within the AWS account, can be increased via support requests, and scale with the account rather than being a fixed third-party ceiling.


## 5. Account Deletion — Technical Design and Terms of Service Commitments

**Context:** Reviewer feedback identified that as more services are added to the architecture, fully deleting a user's data becomes progressively harder. The proposal named this as a concern (Empty Chair stakeholder: the student who deletes their account) and the ethics ledger listed account deletion as a mitigation. However, no CCT entry enforced it. This section records both the technical approach and the ToS commitments that the implementation must honour.

**Technical side — what gets deleted and in what order:**

The deletion cascade must be ordered to avoid orphaned data and to handle failure modes cleanly:

1. **Redis job queue** — Scan and discard any pending jobs where `payload.ownerId` matches the user being deleted. This must happen *before* the MongoDB delete so the Worker cannot pick up a job for a user whose notes no longer exist.
2. **MongoDB derived content** — Delete `flashcardSets` and `flashcards` by `ownerId`. These are derived from notes but are separate documents with no cascading delete in MongoDB.
3. **MongoDB primary content** — Delete `notes`, `studyMaterials`, `jobs`, `groupAuditLog` entries by `ownerId`.
4. **MongoDB group membership** — Remove the user's ID from all `groups.memberIds` arrays. If the user is a group owner, their groups are either transferred or deleted (policy decision — for capstone scope, groups owned by deleted users are deleted along with all group content).
5. **MongoDB users document** — Delete last, after all foreign references are cleaned up.
6. **Redis cache flush** — Delete all keys matching `cache:{userId}:*` to remove any cached responses that might be served to another user who happens to request data that included the deleted user's content.

**In-flight Worker job guard:** A Worker task may have already dequeued a job from Redis and be mid-processing (e.g., waiting on an OpenAI response) when the deletion cascade fires. Step 1 cannot reach this job because it is no longer in the queue. The Worker must check whether the job's `ownerId` still exists in MongoDB *before* making the OpenAI call. If the user has been deleted, the Worker discards the job without writing results and without marking it failed (there is no user to surface the failure to).

**What changed from the original stronger plan:** The shipped implementation does **not** delete the Auth0 identity on account deletion. This is intentional. The platform deletes all StudyFlow-managed data immediately, but leaves the Auth0 identity in place so a returning user can sign back in without going through onboarding again. That means account deletion is a **StudyFlow data deletion** control, not an identity-destruction control.

**What cannot be deleted:** Note content already transmitted to OpenAI before the deletion request cannot be recalled from OpenAI's infrastructure. OpenAI retains API call logs per their data retention policy. This is an honest architectural limitation — the deletion cascade covers all data under the platform's control but not data already processed by a third party.

**Terms of Service commitments:**

The following must be explicitly stated in the platform's Terms of Service to set accurate user expectations:

| Commitment | Scope | Caveat |
| --- | --- | --- |
| Account deletion removes all user-authored notes and study materials | Immediate, upon request | None — this is fully under platform control |
| Account deletion removes all AI-generated flashcards and summaries derived from user notes | Immediate, upon request | None — these are stored in platform MongoDB |
| Account deletion removes the user from all groups and removes pending AI jobs | Immediate, upon request | None |
| Account deletion does not remove content from OpenAI's API processing logs | N/A | OpenAI retains API call logs for up to 30 days per their API data usage policy; the platform cannot delete this data on the user's behalf |
| Group content authored by the deleted user within a shared group topic | Deleted with the account | Other group members lose access to that content — this is disclosed at group join |
| Backup/point-in-time restore retention | MongoDB Atlas point-in-time restore retains snapshots for up to 7 days | Deleted data may exist in backups for up to 7 days; backups are not accessible to other users and are only used for disaster recovery |

**Identity note:** The Auth0 login identity is retained. This is a deliberate UX trade-off so returning users do not have to repeat onboarding; it is documented in the claim pack as a change from the earlier, stronger delete-everything plan.

**Why the N-day grace period is set to 0 (immediate):** The reviewer asked about the value of N. For capstone scope, deletion is immediate — there is no grace period or "soft delete" phase. A soft delete (marking the user as deleted but retaining data for N days in case they change their mind) would complicate the Worker guard logic and the Redis purge and is out of scope. If the platform ever adds a grace period, the ToS must state it explicitly and the Worker guard must check for `status: "pending_deletion"` as well as `deleted`.

**CCT reference:** data-005 in cct_v2.md.

## 6. Group Membership, Gatekeeping, and Accountability

**Context:** Peer feedback raised the concern that the "trusted group" model — where only the group owner can add and remove members — creates an opaque gatekeeping mechanism. Capable or legitimate users who are not connected to an established group owner may be systematically excluded, and there is no accountability trail for membership decisions.

**How this applies to StudyFlow:** StudyFlow groups are owner-controlled for adding *other* people, but **public** groups (no join code) appear on the Join Group page (`GET /api/groups/available`); a student can self-join without an invite. **Private** groups still require a join code (`POST /api/groups/join`). There is no global search or structured request-to-join queue. The shipped design adds ownership enforcement (auth-002, auth-003) and membership audit (`gov-005`).

**What changed in v2:**

`gov-005` adds group membership audit logging: every add and remove action is written to a `groupAuditLog` collection with actor, target, group ID, action type, and timestamp. This does not change who can add or remove members (that remains the owner's prerogative), but it creates an evidence trail that can be reviewed if disputes arise or if platform moderation is ever needed.

**What was not addressed (known limitation):** The feedback's full recommendation — standardized onboarding with background checks, referral waitlists, and diversity statistics — is relevant to a job marketplace context and was written for a different project. For StudyFlow's study-group context, the equivalent improvements would be a group discovery mechanism (public/searchable groups) and a request-to-join workflow. These are out of scope for the current capstone but are documented here as future work.

**Future work — owner invite UI:** The current model supports two join flows: public groups are discoverable and joinable by anyone (Join Group browse page); private groups require the owner to share a join code. A third flow — where the owner selects a specific user and sends an invite or link — is not yet implemented in the UI. The API permits `POST /api/groups/:id/members` with an arbitrary `userId` when the caller is the group owner, so the backend is already ready; the frontend UI (pick a user, confirm, notify) remains as a post-capstone improvement.

**CCT reference:** gov-005 in cct_v2.md.


## 7. Note deletion and derived artifacts

**Original assumption:** deleting a note should likely remove every derived artifact tied to that note.

**Shipped choice:** summaries are deleted with the source note, but flashcard sets are retained.

**Why summaries are deleted:** A summary is a compressed rendering of the source note. Without the source note, the summary becomes hard to audit and can misrepresent the original meaning.

**Why flashcards are retained:** Flashcards are treated as distilled study artifacts. Once created, they are intended to stand on their own as knowledge prompts. Deleting them automatically when the source note is removed would make the tool less useful for learners who want to keep practicing the extracted facts after removing the original drafting material.

**Claim-pack impact:** `gov-004` is now intentionally scoped to note content, note material records, derived summaries, and cache invalidation. It no longer implies flashcard deletion on source-note delete.

## 8. Implementation updates since the capstone proposal

The written proposal ([`proposal.md`](proposal.md)) describes intent at proposal time. The following records **what shipped differently** in infra and CI/CD so reviewers and future maintainers can reconcile documents without guessing.

### 8.1 CI/CD shape (GitHub Actions)

**Proposal sketch:** a linear pipeline: push to `main` → lint → tests → Docker build → ECR → deploy to ECS.

**Implemented:** three workflows (documented in [`.github/workflows/README.md`](../.github/workflows/README.md)):

- **Pull requests:** API and Worker lint/test, plus **Terraform plan only** (no apply). Plan uses placeholder container image URIs so infrastructure can be validated before merge.
- **Push to `main`:** Build and push API/Worker images to ECR; persist the chosen image URIs and lightweight deploy metadata in **SSM Parameter Store** (`/studyflow/prod/...`). **No automatic Terraform apply** on merge.
- **Deploy:** **Manual** workflow dispatch with a **`production` GitHub Environment** gate (approvals configurable). Terraform runs **plan** then **apply** against a saved plan file, then forces ECS rolling deployments and hits the ALB **`/health`** endpoint.

**Rationale:** Separating “build artifacts” from “apply infra + roll services” reduces accidental full deploys on every commit, keeps production changes behind an explicit approval, and still ties image tags to immutable Git SHAs in ECR/SSM.

**Rollback:** The deploy workflow accepts an optional **`rollback_sha`** input. When set, Terraform uses `ECR_REPOSITORY:SHA` for both services instead of reading the latest URIs from SSM—allowing rollback to a previously built tag. This is more explicit than “redeploy previous task definition revision” but aligns with tag-based ECR workflows.

**Not carried forward from an earlier single-file workflow:** container vulnerability scanning (e.g. Trivy) on every build was dropped when workflows were split. The shipped process instead relies on **ECR scan-on-push** plus a manual review step before Terraform apply. This is less automatic than the original "always fail the pipeline on scanner output" idea, but it matches the current deployment workflow and claim wording.

### 8.2 Terraform execution and state

**Proposal:** implied GitHub Actions “deploy” without detailing state backend.

**Implemented:** **Terraform Cloud** holds **remote state** (`cloud` block in `versions.tf`). CI/CD and local developers run the Terraform CLI with a **`TF_TOKEN`**; plans and applies execute on the runner (**CLI-driven / local execution** from TFC’s perspective), not as TFC remote runs triggered only from the TFC UI.

**Variable hygiene:** Stable non-secret inputs live in committed **`config.tfvars`**. Sensitive and runtime values (cert ARNs, Secrets Manager ARNs, Auth0 config strings, image URIs) are written to **`terraform.tfvars`** in CI or locally; that file is **gitignored** with an **`terraform.tfvars.example`** template.

**Residency note:** Because `config.tfvars` is committed and used for the production stack, it is part of the actual region evidence for `res-001`; the claim is no longer framed as "just the Terraform default value".

### 8.3 Redis and managed data stores in AWS

**Proposal:** ElastiCache Redis in-VPC with AUTH and encryption.

**Implemented (Terraform):** No ElastiCache module. **Redis connection strings** (e.g. **Upstash** or other hosted Redis) are stored in **Secrets Manager** and referenced by ARN in the ECS task definition, same pattern as MongoDB and OpenAI. This matches the MVP’s need for a queue/cache URL without operating Redis clusters on AWS for the capstone footprint.

**Trade-off:** You lose “all traffic stays inside your VPC to Redis” unless the provider offers VPC peering/private endpoints and you configure network paths accordingly. You gain simpler operations and cost for small scale. If course requires in-VPC ElastiCache, that would be a deliberate stack addition.

**Operational wording impact:** Claims about Redis are now phrased around **worker recovery behavior** and **logical key-prefix separation**, not strong ElastiCache-style persistence/policy guarantees that the shipped stack does not control directly.

### 8.4 Secrets and configuration surfaces

**Proposal:** all production secrets in Secrets Manager, no `.env` in production.

**Still true for runtime app secrets** (Mongo URI, Redis URL, OpenAI key): ECS reads them via **`valueFrom`** Secrets Manager ARNs.

**Additional surface:** GitHub **repository secrets** supply Terraform variables during CI (Route53 zone, cert ARNs, secret ARNs, Auth0-related strings). Those values configure AWS resources; they are not duplicate copies of Mongo/OpenAI **payloads** if you only pass **ARNs** into Terraform. **Auth0 domain/audience** (and SPA client id for Terraform variables) may be treated as configuration rather than high-rotation credentials.

**Frontend `VITE_*` build-time config:** Not injected as ECS runtime secrets in this stack; static hosting build pipeline variables belong in whatever job builds the SPA (not fully scripted in the three workflows described above if builds are local or separate).

**Local safety improvement added after review:** the repo-level pre-commit hook now rejects staged `.env` files in addition to running lint/tests. This does not replace secret scanning, but it gives the `data-003` claim a concrete local enforcement point.

### 8.5 GitHub OIDC IAM policy

The AWS principal used by Actions is **not** defined inside Terraform in-repo. A **customer-managed policy JSON** template ([`terraform/iam/github-oidc-ci-policy.json`](../terraform/iam/github-oidc-ci-policy.json)) documents least-effort scoping for this stack (VPC/ALB/ECS/CloudFront/SSM/Secrets Manager reads, scoped IAM for `studyflow-*` roles, etc.). Operators attach it to the OIDC-trusted role manually.

### 8.6 Repository structure (deployment vs capstone monorepo)

Workflow YAML uses **repository-root paths** (`api/`, `worker/`, `terraform/`), which match this repository's layout — the application code lives directly at the git root, so GitHub Actions resolves those paths as-is. See [`.github/workflows/README.md`](../.github/workflows/README.md). Infrastructure details: [`terraform/README.md`](../terraform/README.md).

### 8.7 Operational claims (wording)

The proposal listed a claim that production deploys are **fully automatic**. With the implemented **manual deploy** and **environment gate**, the accurate claim is **“test gates on PR and main; production Terraform apply and ECS roll require explicit approval (or runner dispatch policy you configure).”** Update [`claims.md`](claims.md) or course artifacts if that language was copied verbatim from the proposal.

### 8.8 Observability implementation

The proposal discussed monitoring at a high level, but the delivered stack has a more concrete observability shape that is now part of the documented operational design.

- **Structured application logs:** API and Worker emit JSON logs to stdout with `ts`, `level`, `service`, and `msg`. The API issues `x-request-id`, stores `requestId` on queued jobs, and the Worker logs that same `requestId` during processing. This gives a usable trace from HTTP request to queued job to worker execution. See [`observability.md`](observability.md).
- **AWS monitoring resources:** Terraform provisions a dedicated observability module under [`terraform/modules/observability`](../terraform/modules/observability). It creates CloudWatch alarms for ALB 5xx and unhealthy targets, an SNS topic for alert delivery, and a dashboard for ALB and ECS health metrics.
- **Alert-delivery trade-off:** `observability_alert_email` is optional. If set, Terraform creates an SNS email subscription; if omitted, alarms still exist but no human notification endpoint is wired yet. This keeps the baseline capstone stack deployable while making the alert path explicit.

**Receipts in this pack:** [`evidence/receipts/observability-alarms.png`](../evidence/receipts/observability-alarms.png) and [`evidence/receipts/observability-sns.png`](../evidence/receipts/observability-sns.png) show the CloudWatch alarm surface and the SNS notification channel used for alerting.

### 8.9 Claim-pack corrections from the original plan

Several clauses were reworded so the evidence pack matches the shipped implementation rather than the stronger original sketch:

- **`data-001`:** the earlier CMK/KMS wording was dropped. The delivered stack relies on MongoDB Atlas default encryption at rest, so the claim now names that actual control.
- **`data-005`:** Auth0 identity deletion was removed from scope. The deletion control is now accurately framed as deleting all StudyFlow-managed data while keeping the Auth0 identity for smoother re-entry.
- **`gov-003`:** the original flashcard provenance idea was incorrect for the shipped code. The real provenance link exists on summaries via `derivedFrom`, so both the claim and test were corrected.
- **`gov-004`:** flashcards are intentionally retained when a source note is deleted. The claim now covers note data, summary cleanup, and cache invalidation only.
- **`ai-001`:** the retry mechanism is implemented as in-process exponential delay plus requeue, not a Redis delay-key scheduler.
- **`ai-003`:** the claim now names the exact Redis namespaces the code actually uses for queued work and cached job status, instead of vaguely referring to broad queue/cache isolation.
