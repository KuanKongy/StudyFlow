# Ethics ledger v2

Records ethical concerns, impacted parties, risks, and mitigations for key design decisions in StudyFlow.

| Date | Decision | Impacted parties | Risk | Mitigation |
| --- | --- | --- | --- | --- |
| 2026-02-10 | Send student notes to OpenAI for AI processing | Students with sensitive notes unaware content leaves Canada | Unfiltered PII sent to US provider (CLOUD Act); cost spikes incentivise data monetization; malicious content laundered through AI generation | Rate limit (rate-001), disclose transit before first use (res-002), cap note size (rate-002). Future: AWS Bedrock to keep data in ca-central-1. |
| 2026-02-10 | Group membership and shared access to notes | Removed/departing members; members whose study patterns are exposed | Owner can surveil or remove members with no audit trail; group metadata has commercial value if platform monetizes | Ownership checks on admin actions (auth-002, auth-003), personal notes isolated (gov-001), membership audit log (gov-005). |
| 2026-02-10 | Store user data in MongoDB Atlas (US-owned cloud provider) | All users — MongoDB holds all PII and user-authored content | CLOUD Act: US authorities can compel access despite ca-central-1 storage; full data exposure if database is compromised | Atlas default TDE at rest (data-001), VPC peering, Secrets Manager (data-003), honest CLOUD Act disclosure (res-002). |
| 2026-02-10 | No account deletion or data export feature in MVP | Students who want data removed after leaving the platform | PII and AI-derived content persist indefinitely; retained data is a liability in breaches or legal requests | Full deletion cascade on DELETE /api/account (data-005); data export feature; OpenAI history limitation disclosed in ToS. |
| 2026-02-10 | CI/CD pipeline with automated deployment to production | Active users; all users whose data is reachable via pipeline secrets | Bad deploy causes outage or data corruption; compromised Actions workflow is an attack vector; supply-chain attacks via npm packages | CI gates before merge (cicd-001), image vulnerability scan (cicd-003), secrets in Secrets Manager, pinned npm dependencies. |

# Ethics ledger v1
Has more info and more understandable, the version above is just a summary.

This ledger applies the four ethical lenses (Empty Chair, PII, Monetization, Manipulation) to key design decisions in StudyFlow. And records ethical concerns, affected parties, and mitigations.

## Four Lenses Applied

| Date | Decision | Lens | Analysis |
| --- | --- | --- | --- |
| 2026-02-10 | Send student notes to OpenAI for AI processing | Empty Chair | The student who writes personal, sensitive notes (health conditions, political opinions in coursework) and clicks "generate flashcards" without realizing their content leaves Canada and is processed by a US-based third party |
| 2026-02-10 | Send student notes to OpenAI for AI processing | PII | Note content may contain names, student IDs, course-specific references, or personal reflections — none of which are filtered before transmission to OpenAI |
| 2026-02-10 | Send student notes to OpenAI for AI processing | Monetization | OpenAI charges per token; the platform operator pays but if costs spike, there is incentive to monetize student data or add ads to offset costs |
| 2026-02-10 | Send student notes to OpenAI for AI processing | Manipulation | A malicious user could submit deliberately harmful, illegal, or copyrighted content through notes to "launder" it into AI-generated flashcards |
| 2026-02-10 | Group membership and shared access to notes | Empty Chair | The student who is removed from a group — do they lose access to notes they personally authored within group topics? The student who leaves a toxic study group — can the owner still see their contributions? |
| 2026-02-10 | Group membership and shared access to notes | PII | Group membership reveals social connections (who studies with whom); topic titles may reveal courses being taken; shared notes persist beyond the context they were shared for |
| 2026-02-10 | Group membership and shared access to notes | Monetization | Groups are free, but group data has aggregate value — study patterns, popular topics, collaboration networks are attractive to edtech companies if the platform monetizes |
| 2026-02-10 | Group membership and shared access to notes | Manipulation | A group owner could surveil members' study habits, remove members punitively, or access shared notes and claim authorship; without audit logs, there is no accountability |
| 2026-02-10 | Store user data in MongoDB Atlas (US-owned cloud provider) | Empty Chair | The student who assumes "my data is in Canada" and does not know that MongoDB Inc. is a US corporation subject to the CLOUD Act, meaning US authorities can compel access regardless of physical data location |
| 2026-02-10 | Store user data in MongoDB Atlas (US-owned cloud provider) | PII | Emails, nicknames, profile pictures, Auth0 subject IDs, and all user-authored content — the database is the primary PII store |
| 2026-02-10 | Store user data in MongoDB Atlas (US-owned cloud provider) | Monetization | MongoDB Atlas charges based on cluster size and I/O; as usage grows, database costs are the largest variable expense; free tier (512MB) is sufficient for capstone but not real usage |
| 2026-02-10 | Store user data in MongoDB Atlas (US-owned cloud provider) | Manipulation | If the database is compromised (weak network config, leaked credentials), all user data is exposed at once; shared clusters may co-locate data with other tenants |
| 2026-02-10 | No account deletion or data export feature in MVP | Empty Chair | The student who finishes a course, no longer wants their data on the platform, and has no way to remove it; the student who shared notes and wants all traces removed after graduation |
| 2026-02-10 | No account deletion or data export feature in MVP | PII | Without account deletion, PII (email, name, picture, Auth0 ID) persists indefinitely; notes may persist in AI-generated derivatives even after the source note is deleted |
| 2026-02-10 | No account deletion or data export feature in MVP | Monetization | Retaining user data inflates "user count" metrics which could justify pricing or attract investors; there is a financial incentive to never delete data |
| 2026-02-10 | No account deletion or data export feature in MVP | Manipulation | A platform that retains all student data indefinitely could be compelled to produce it (legal requests, data breaches) long after the student stopped using the service; data that does not exist cannot be breached |
| 2026-02-10 | CI/CD pipeline with automated deployment to production | Empty Chair | Active users during a bad deployment; if a broken build bypasses tests, users experience downtime or data corruption with no warning |
| 2026-02-10 | CI/CD pipeline with automated deployment to production | PII | The CI/CD pipeline has access to production secrets (database URIs, API keys); if compromised, it becomes an attack vector to all production data |
| 2026-02-10 | CI/CD pipeline with automated deployment to production | Monetization | Automated deployment reduces operational cost but cutting corners on test coverage to ship faster creates reliability debt that users pay for with outages |
| 2026-02-10 | CI/CD pipeline with automated deployment to production | Manipulation | An attacker who compromises the repository or Actions workflow could inject malicious code that passes basic tests but exfiltrates data in production; supply-chain attacks via compromised npm packages are a real vector |

## Mitigations Summary

| Decision | Mitigation |
| --- | --- |
| Send notes to OpenAI | Rate limit AI requests (10/hr per user). Disclose data transit to users before first AI use. Cap note size at 50,000 characters. In future: explore self-hosted models. |
| Group membership and shared access | Implement ownership checks on group admin actions (auth-002, auth-003). Personal notes remain invisible to group members (gov-001). In future: audit logging for admin actions; allow members to revoke shared content on departure. |
| MongoDB Atlas storage | Rely on Atlas default TDE at rest (data-001). VPC peering so database is not publicly accessible. Secrets Manager for credentials (data-003). Document CLOUD Act limitation honestly (res-002). |
| No account deletion | Implement account deletion endpoint that deletes user document, all notes and materials, removes from group memberIds, deletes derived AI content, and purges Redis caches. Add data export feature. |
| CI/CD automated deployment | Branch protection requiring PR review. Docker image vulnerability scanning (cicd-003). Secrets in GitHub Actions encrypted secrets. Pin npm dependencies to exact versions. |
