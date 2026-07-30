# Clause → Control → Test (CCT) v1

> **Editor's note (2026-07-29):** superseded by [cct_v2.md](cct_v2.md). Line-number citations below refer to the pre-refactor tree and have drifted; see docs/audit.md for the current state of each control.

Link for the implementation: current MVP (see [KuanKongy/StudyFlow](https://github.com/KuanKongy/StudyFlow))

## Authentication and Authorization

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| "All /api/* endpoints require valid Auth0 JWT" | express-oauth2-jwt-bearer middleware applied to /api route prefix | Send request to GET /api/me with no Authorization header → expect 401 | api/src/index.js:80 — app.use("/api", checkJwt) | evidence/auth-001-unauthorized-test.png |
| "Only the group owner can delete that group" | Ownership check middleware: if group.ownerId does not match req.auth.payload.sub, return 403 | Non-owner sends DELETE /api/groups/:id → expect 403 Forbidden | api/src/index.js:481 — DELETE /api/groups/:id handler | evidence/auth-002-owner-delete-test.png |
| "Only the group owner can remove members" | Ownership check middleware on member removal endpoint | Non-owner sends DELETE /api/groups/:id/members → expect 403 | api/src/index.js:508 — DELETE /api/groups/:id/members handler | evidence/auth-003-owner-remove-test.png |
| "Users can only see their own topics + topics from their groups" | Query-level filtering using $or: [ownerId, groupId in memberGroups] | User B (not in Group X) calls GET /api/topics → topic from Group X must not appear | api/src/index.js:537-549 — GET /api/topics handler | evidence/auth-004-topic-isolation-test.png |
| "Users can only access materials they own or that belong to their group's topics" | Middleware checks material.ownerId matches user or material.topicId leads to a group the user belongs to | User B calls GET /api/materials/:id for User A's personal note → expect 403 | api/src/index.js:253 — GET /api/materials/:id handler | evidence/auth-005-material-isolation-test.png |

Claim: "auth-002"  
Naive control: Trust the frontend to only show the delete button to the owner.  
What could go wrong: Any authenticated user with the group ID can call DELETE /api/groups/:id directly via curl or Postman. The server has no ownership check — the code literally has //TODO: make it so only owner can delete.  
The catch test: Authenticate as User B. Call DELETE /api/groups/:id where the group was created by User A. If the group is deleted, the control is missing.  

Claim: "auth-005"  
Naive control: "Only group members can see group topics, so they can't find material IDs."  
What could go wrong: Security through obscurity. Material IDs are MongoDB ObjectIds — guessable if you know the timestamp pattern. A malicious user could enumerate IDs. Also, if any endpoint ever returns a material ID in a list, the ID is exposed.  
The catch test: User A creates a personal note (topicId with groupId: null). User B (different user, not in any shared group with A) calls GET /api/materials/:materialId/note with User A's material ID. Currently returns the note content — the test should expect 403.  


## Data Protection

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| "Data encrypted at rest via MongoDB Atlas TDE (AES-256)" | MongoDB Atlas TDE enabled with AWS KMS CMK | Revoke kms:Decrypt from the application IAM role — app should fail to read data | MongoDB Atlas cluster config + AWS KMS key policy | evidence/data-001-atlas-encryption-screenshot.png |
| "All service-to-database connections use TLS" | MongoDB URI uses mongodb+srv:// (enforces TLS); ElastiCache in-transit-encryption=true | Attempt mongo --tls false connection to Atlas → connection refused | MongoDB Atlas network config; ElastiCache parameter group | evidence/data-002-tls-connection-test.log |
| "No secrets in source code or images" | .gitignore for .env; Secrets Manager for production; no ENV directives with real values in Dockerfiles | git log --all -p grep for real secret patterns → 0 matches | .gitignore; Dockerfiles; ECS Task Definition | evidence/data-003-secrets-scan.log |
| "OpenAI API key only accessible by Worker service" | Secrets Manager secret injected only into Worker task definition; API task definition has no reference to it | Inspect API container env vars → OPENAI_API_KEY must be undefined | ECS Task Definitions (API vs Worker) | evidence/data-004-key-isolation-test.png |

Claim: "data-001"  
Naive control: Enable "Default Encryption" in MongoDB Atlas console.  
What could go wrong: **Key Sovereignty.** If MongoDB/AWS manages the keys, they can be compelled via the U.S. CLOUD Act to decrypt data without your knowledge. MongoDB Atlas's default TDE uses their managed keys.  
The catch test: Revoke the kms:Decrypt permission from the application's IAM role while leaving database network permissions intact. If the application can still retrieve plaintext data, the control has failed — the encryption is managed by someone else and you have no real control over it.  

## Rate Limiting

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| "10 AI job requests per user per hour" | Redis INCR + EXPIRE on key rate:{userId}:ai checked in middleware before job creation | Send 11 POST /api/materials/:id/flashcards requests within 60s → request 11 must receive 429 | Rate limiter middleware on AI job endpoints | evidence/rate-001-burst-test.log |
| "Notes over 50,000 chars are rejected for AI processing" | Content length check in worker before OpenAI call | Submit 60,000-char note → trigger flashcard generation → job status must be "failed" | worker/index.js — handleGenerateFlashcards | evidence/rate-002-size-limit-test.log |

Claim: "rate-001"  
Naive control: Use express-rate-limit with in-memory store.  
What could go wrong: **Distributed bypass.** When StudyFlow scales to multiple ECS tasks behind the ALB, each instance maintains its own counter. A user hitting different instances gets 10N requests (where N = number of instances), bypassing the limit entirely.  
The catch test: Run a load test targeting the ALB with a single user's JWT. Send 15 requests in rapid succession. The test passes only if exactly 10 succeed and 5 receive 429, regardless of which backend instance handled them.  


## Data Residency

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| "All AWS resources in ca-central-1 only" | IAM SCP: Deny all where aws:RequestedRegion != ca-central-1; Terraform provider locked to ca-central-1 | aws ec2 describe-instances --region us-east-1 → 0 StudyFlow resources; attempt aws s3 mb in us-east-1 → denied | AWS Organizations SCP; Terraform provider.aws.region | evidence/res-001-region-audit.log |
| "Note content transits to OpenAI (US) for AI processing — disclosed to users" | Disclosure banner in UI before AI feature use; res-002 documented in claims | Check UI — disclosure must be visible before first AI job submission | Worker server AI call; Frontend disclosure component | evidence/res-002-disclosure-screenshot.png |

Claim: "res-001"  
Naive control: Set the primary region to ca-central-1 in the AWS console.  
What could go wrong: **Processing leakage.** While MongoDB and Redis are in Canada, the Worker sends raw note content to OpenAI's API hosted in the US. The data is "stored" in Canada but "processed" outside Canada. Also, CloudFront is a global CDN — cached responses may exist on edge nodes outside Canada (though the SPA is public content, not PII).  
Honest limitation: We cannot guarantee data stays in Canada during AI processing. We disclose this to users and let them choose whether to use AI features.  

## Access Control (Governance)

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| "Personal notes invisible to group members" | Row-level ACL: material query filtered by ownerId when topic has no group | Authenticated group member GETs a personal note ID they don't own → expect 403 | API controller logic on GET /api/materials/:id/note | evidence/gov-001-personal-note-isolation-test.png |
| "AI processing requires ownership of source note" | Ownership check: material.ownerId matches req.auth.payload.sub before job creation | User B triggers POST /api/materials/:id/flashcards on User A's note → expect 403 | api/src/index.js — flashcard/summary job handlers | evidence/gov-002-ai-ownership-test.png |
| "AI-generated flashcards link to source note" | Worker stores materialId (source reference) in FlashcardSets document | db.flashcardSets.find({ materialId: { $exists: false } }) → must return 0 | worker/index.js — flashcard set insertion | evidence/gov-003-source-ref-query.log |
| "Deleting a note removes content from Notes and StudyMaterials + invalidates cache" | Delete handler removes from both collections; redis.del on topic cache key | Delete note → GET /api/materials/:id/note → null; check Redis key → absent | api/src/index.js:311-330 — delete handler | evidence/gov-004-deletion-test.log |

## CI/CD and Deployment

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| "No code reaches production without passing CI checks" | GitHub Actions workflow with lint + test stages; branch protection on main | Push commit with failing test to main PR → deploy step must not execute | .github/workflows/deploy.yml; GitHub branch protection rules | evidence/cicd-001-failed-build-screenshot.png |
| "Production deploys are automated, no manual SSH" | GitHub Actions → ECR push → ECS task definition update → rolling deploy | Check ECS deployment history — every deployment must trace to a GitHub Actions run | GitHub Actions workflow; ECS deployment history | evidence/cicd-002-deploy-log.png |
| "Docker images scanned before deploy" | trivy or ECR native scan in CI pipeline; deploy blocked on critical findings | Build image with known CVE → scan step must fail and block deploy | GitHub Actions scan step | evidence/cicd-003-scan-report.png |

## Operational

| Clause | Control | Test | Enforcement point | Evidence |
| --- | --- | --- | --- | --- |
| "ALB health checks use /health endpoint" | ALB target group health check path = /health; API returns { ok: true } | Stop API container → ALB must drain and stop routing to it within health check interval | api/src/index.js:64; ALB target group config | evidence/ops-001-health-check-test.log |
| "Logs retained in CloudWatch for 30 days" | ECS awslogs log driver; CloudWatch log group retention = 30 days | Check log group retention setting — must be 30, not "Never Expire" | ECS Task Definition logConfiguration; CloudWatch log group | evidence/ops-002-cloudwatch-logs.png |
| "Queued jobs survive Worker restart" | Redis list persistence (RDB/AOF); Worker brPop resumes on reconnect; ECS restarts failed tasks | Enqueue 5 jobs → kill Worker → restart → all 5 jobs must eventually complete | Redis persistence config; ECS service desiredCount | evidence/ops-003-worker-recovery-test.log |
| "Failed AI jobs don't block the queue" | Worker catch block sets status: "failed" and continues while(true) loop | Trigger job that causes OpenAI error → next job in queue must still process | worker/index.js:62-67 — catch block in main loop | evidence/ops-004-failed-job-test.log |