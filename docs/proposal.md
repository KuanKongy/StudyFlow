# Capstone Proposal

## Problem Framing

Students collaborate constantly — sharing notes, creating flashcards, studying in groups — but their tools are fragmented across Google Docs, Discord, Quizlet, and messaging apps. This fragmentation means organizing takes longer than studying, AI study tools exist but are isolated from group workflows, and there is no single shared workspace for study groups.

**StudyFlow** is a collaborative study platform that combines note organization, group workspaces, and AI-powered study material generation (summaries, flashcards) into a single system. The hackathon MVP runs locally via Docker Compose. The capstone extends this into a cloud-deployed solution on AWS.

The current MVP (see [KuanKongy/StudyFlow](https://github.com/KuanKongy/StudyFlow) and [Studyflow](../StudyFlow)) consists of:
- React frontend (Vite + TypeScript + Tailwind + shadcn/ui)
- Express API server with Auth0 JWT authentication
- Redis for job queue (brPop polling) and response caching
- MongoDB for users, groups, topics, studyMaterials, notes, flashcardSets, flashcards, jobs
- Worker server that polls Redis, calls OpenAI for flashcard generation and summarization

### What is missing (Cloud Gap)

| Concern | MVP State | Cloud Target |
| --- | --- | --- |
| Deployment | docker-compose up on localhost | ECS Fargate containers in ca-central-1 |
| Frontend hosting | npm run dev (Vite dev server) | S3 + CloudFront CDN |
| Database | Local Mongo container, no auth, no encryption | MongoDB Atlas (ca-central-1) with TDE + network peering |
| Cache/Queue | Local Redis container, no auth | ElastiCache Redis with AUTH token + encryption in transit |
| Secrets | .env files in repo directories | AWS Secrets Manager, injected at container runtime |
| CI/CD | None — manual | GitHub Actions: lint → test → build → deploy to ECS |
| Rate limiting | None | Redis-backed distributed rate limiter middleware |
| Access control | Auth0 JWT on /api routes, but no ownership checks on resources | Per-resource ownership validation middleware |
| Monitoring | console.log | CloudWatch Logs + Container Insights + health check alarms |
| Data residency | Wherever Docker runs | All services region-locked to ca-central-1 |
| HTTPS | None | ACM certificate on ALB + CloudFront |

## Stakeholders and Empty Chair

| Stakeholder | In the Room? | Concern |
| --- | --- | --- |
| Developer (me) | Yes | Build it, deploy it, maintain it |
| Students using the platform | No | Their notes contain personal study content; they trust it won't leak |
| Group members | No | They expect group content is visible only to group members |
| Students who leave a group | No | What happens to their notes? Do they lose access? Does the group keep copies? |
| Students who delete their account | No | Is their data actually deleted from all storage layers? |
| OpenAI (AI provider) | No | Student notes are sent to their API — they become a data processor |
| Future instructors | No | Could they be given admin-like visibility into student notes? That would be surveillance |

**The person in the empty chair** is the student who writes personal notes, shares them with a group, then leaves the group or deletes their account. What happens to their data in MongoDB, in Redis caches, in OpenAI's processing logs?

## Data and Privacy

### What PII flows through StudyFlow

| Data | Source | Storage | Sensitivity |
| --- | --- | --- | --- |
| Email address | Auth0 /userinfo | MongoDB users collection | PII |
| Display name / nickname | Auth0 /userinfo | MongoDB users collection | PII |
| Profile picture URL | Auth0 /userinfo | MongoDB users collection | Low (URL only) |
| Auth0 subject ID (sub) | Auth0 JWT | MongoDB (every collection as ownerId) | Pseudonymous identifier |
| Note content | User-authored | MongoDB notes collection + sent to OpenAI | Could contain anything — names, course info, personal reflections |
| AI-generated summaries | OpenAI response | MongoDB studyMaterials | Derived from potentially sensitive notes |
| AI-generated flashcards | OpenAI response | MongoDB flashcards + flashcardSets | Derived from potentially sensitive notes |

### Data flow to external services
```
User Note Content → API Server → Redis Queue → Worker → OpenAI API → Summary/Flashcards returned → Stored in MongoDB (ca-central-1)
```

Note content leaves the Canadian region when sent to OpenAI for processing. OpenAI is a US company subject to the CLOUD Act.

## Cloud Architecture Design

![cloud_arch](../evidence/receipts/cloud_arch.png)

### Compute: ECS Fargate

Why Fargate over EC2: No server management, pay-per-use, auto-scaling per service. The API and Worker are already Dockerized.

Why not Lambda: The worker uses a long-polling while(true) loop with brPop. Lambda's 15-minute timeout and cold starts make it a poor fit. The API server is a stateful Express app with persistent DB/Redis connections — also better suited to long-running containers.

Services:
- studyflow-api — runs the Express API, scales 1-4 tasks behind ALB
- studyflow-worker — runs the job processor, scales 1-2 tasks based on queue depth

### Storage: MongoDB Atlas + ElastiCache Redis

Why MongoDB: StudyFlow's data is naturally document-shaped — notes are self-contained, flashcard sets contain nested cards, materials have varying schemas by type. The MVP already uses MongoDB. Access patterns are primarily "get by ID" or "get by ownerId/topicId" — no complex joins needed.

Why not PostgreSQL: No relational joins across entities. Topics belong to groups, but the query is always "get my topics" or "get topics for these groupIds" — a document query with an index, not a JOIN.

Why ElastiCache Redis: The MVP already uses Redis for both job queuing and response caching. ElastiCache provides persistence, AUTH tokens, encryption in transit, and can be shared across multiple ECS tasks.

### Frontend: S3 + CloudFront

The React SPA is static files after build. S3 stores them; CloudFront serves them globally with HTTPS via ACM certificate.

### Networking and region lock

All AWS resources deployed to ca-central-1:
- VPC with private subnets for ECS tasks, ElastiCache
- Public subnets for ALB only
- MongoDB Atlas peered to the VPC in ca-central-1
- IAM SCP denying resource creation outside ca-central-1

### CI/CD: GitHub Actions

```
Push to main → Lint → Unit Tests → Integration Tests → Docker Build → Push to ECR → Deploy to ECS
```

Gates:
- Tests must pass before deploy
- Docker image scanned for vulnerabilities
- Only main branch triggers production deploy
- Rollback: ECS keeps previous task definition; redeploy previous revision

### Secrets management

All secrets (Auth0 domain/audience, MongoDB URI, Redis URL, OpenAI API key) stored in AWS Secrets Manager and injected into ECS task definitions at runtime. No .env files in production.

## Constraints and Trade-offs

| Constraint | Impact | Mitigation |
| --- | --- | --- |
| AWS Free Tier budget | Fargate, ElastiCache, and Atlas all have limited free tiers | Start with minimal task counts (1 API, 1 Worker); monitor costs weekly |
| OpenAI API costs | Each summary/flashcard generation costs tokens | Rate limit AI requests per user; cap note size at 50,000 chars (already implemented) |
| Data residency vs AI processing | Notes leave Canada when sent to OpenAI | Document the transit in claims; consider client-side preprocessing in future |
| Single-region deployment | No multi-region redundancy | Acceptable for capstone scope; document as known limitation |
| Auth0 free tier | 7,500 monthly active users | Sufficient for capstone; would need paid plan at scale |

## Distributed Systems Problem

StudyFlow is not just "uses cloud services." It solves real distributed systems challenges:

1. **Asynchronous job coordination**: The API enqueues jobs; the Worker dequeues and processes them; the frontend polls for status. This is a distributed producer-consumer pattern across three separate services sharing state via Redis and MongoDB.

2. **Cache consistency**: Redis caches topic materials and job statuses. When notes are created, updated, or deleted, the API must invalidate the correct cache keys. With multiple API instances behind a load balancer, all instances must share the same Redis to avoid stale reads.

3. **Eventual consistency of AI results**: When a user requests flashcard generation, the UI shows "processing" and polls. The flashcards don't exist yet. The system must handle the window where the job is queued but not yet processed, and degrade gracefully if the worker fails.

4. **Shared state across services**: The API and Worker both read/write to MongoDB and Redis. Schema changes, index management, and connection handling must be coordinated across independently deployed containers.

## Intended Claims (Summary)

This project will make and enforce claims across five categories:

1. **Authentication and Authorization** — Every API endpoint requires valid Auth0 JWT; resources are scoped to owners/group members
2. **Data Protection** — Encryption at rest (MongoDB TDE), encryption in transit (TLS), secrets not in code
3. **Rate Limiting** — AI job requests are rate-limited per user to prevent cost overruns
4. **Data Residency** — All persistent storage in ca-central-1 (with documented exception for OpenAI transit)
5. **Access Control** — Group membership enforced on shared resources; personal notes invisible to group members
6. **AI Governance** — AI processing requires opt-in; generated content links back to source
7. **CI/CD and Deployment** — Automated pipeline with test gates; no manual production deploys
8. **Operational** — Health checks, monitoring, and graceful degradation

See [claims.md](./claims.md) for the full list.

## Legal Documents

StudyFlow includes user-facing Terms of Service and Privacy Policy documents:
- [Terms of Service](../legal/terms-of-service.md) — covers ownership (Nam Le), account rules, content ownership/collaboration, AI processing disclosure (OpenAI/CLOUD Act), usage limits, deletion policy, group rules, acceptable use, and liability disclaimer.
- [Privacy Policy](../legal/privacy-policy.md) — covers PII collected, data storage/encryption, third-party processors (Auth0, OpenAI), data residency (ca-central-1 with OpenAI transit exception), deletion rights, cookies/tokens, and no-monetization pledge.

Content is derived from [claims.md](./claims.md), [cct_v2.md](./cct_v2.md), [ethics_ledger_v1.md](./ethics_ledger_v1.md), and the Data and Privacy section above.