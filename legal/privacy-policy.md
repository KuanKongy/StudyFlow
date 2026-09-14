# Privacy Policy

**Last updated:** 09/13/2026

---

## 1. Introduction

Welcome to **StudyFlow** (**"Company"**, **"we"**, **"our"**, **"us"**), a collaborative study platform operated by Nam Le.

Our Privacy Policy governs your use of the StudyFlow web application (**"Service"**) and explains how we collect, safeguard and disclose information that results from your use of the Service. We use your data only to provide the Service. By using the Service, you agree to the collection and use of information in accordance with this policy. Unless otherwise defined here, terms used in this Privacy Policy have the same meanings as in our [Terms of Service](./terms-of-service.md).

## 2. Definitions

- **SERVICE** means the StudyFlow web application operated by Nam Le.
- **PERSONAL DATA** means data about a living individual who can be identified from that data (or from that data combined with other information in our possession).
- **USER-AUTHORED CONTENT** means the notes, summaries, and flashcards you create or generate on the Service.
- **USER** means the individual using our Service.

## 3. Information Collection and Use

We collect only the information needed to operate the Service: identity information provided by Auth0 and the study content you author. We do not collect usage analytics or tracking data.

## 4. Types of Data Collected

### Personal Data (from Auth0)

- **Email address** — used for account identification.
- **Display name** — your real name or chosen display name.
- **Profile picture URL** — linked from your authentication provider.
- **Auth0 subject ID** — a pseudonymous identifier used internally to associate data with your account.

### User-Authored Content

Notes, flashcards, and summaries you create. This content could contain personal information, including names, course information, and personal reflections. You are responsible for the content you enter.

## 5. Use of Data

- To provide the StudyFlow service: storing your study materials, managing group memberships, and enabling collaboration.
- To generate AI-powered summaries and flashcards when you explicitly request them.
- To authenticate your identity and secure your account.

We do **not** use your data for advertising, profiling, or any purpose other than providing the StudyFlow service.

## 6. Retention of Data

We retain your Personal Data and User-Authored Content only for as long as your account exists. Deleting your account triggers a full cascade:

- All your notes, materials, flashcards, jobs, and group audit-log entries are deleted from MongoDB.
- All your Redis cache entries and queued jobs are purged.
- Your membership is removed from all groups.
- Your Auth0 identity is retained so you can sign in again later without repeating onboarding.

## 7. Transfer of Data

All persistent StudyFlow-managed storage (MongoDB Atlas and hosted Redis) is configured in ca-central-1 (Canada). The sole exception is AI processing: when you use AI features, your note content is transmitted to OpenAI's API servers in the United States. This transit is disclosed before your first use of AI features.

**CLOUD Act Disclosure:** MongoDB Atlas is operated by MongoDB, Inc. and OpenAI is a US-based company; both are subject to the US CLOUD Act. Despite ca-central-1 storage, US authorities could potentially compel access to data held by these providers.

## 8. Disclosure of Data

Your data is never sold, shared with advertisers, or used for any purpose other than providing the StudyFlow service. There is no advertising on StudyFlow. We may disclose Personal Data if required to do so by law.

## 9. Security of Data

- **Database:** MongoDB Atlas, deployed in ca-central-1 (Canada). Data is encrypted at rest using MongoDB Atlas Transparent Data Encryption (AES-256).
- **Cache and Queue:** Hosted Redis, configured in ca-central-1 with TLS encryption in transit.

The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure.

## 10. Service Providers

| Provider | Purpose | Data Shared | Location |
|----------|---------|-------------|----------|
| Auth0 | Authentication and identity | Email, name, profile picture | US-based |
| OpenAI | AI summary and flashcard generation | Note content (text) | US-based |

## 11. Analytics

We do not use third-party analytics services to monitor and analyze the use of our Service.

## 12. Cookies and Local Storage

Auth0 JWT and refresh tokens are stored in browser localStorage for session management. We use no tracking cookies, analytics cookies, or third-party tracking scripts.

## 13. AI Processing and Training Data

When you explicitly request AI features, your note content is sent to OpenAI for processing. OpenAI may retain API call logs per their own data retention policy; StudyFlow has no control over data once it reaches OpenAI, and content already sent cannot be recalled or deleted after the fact — even if you delete your account.

## 14. Your Data Protection Rights

Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA) you have rights of access to and correction of your personal information. On StudyFlow:

- **Access:** You can view all your data through the StudyFlow interface.
- **Correction:** You can edit your profile and materials at any time.
- **Deletion:** You can delete your account at any time; see Section 6 (Retention of Data) for the full cascade.
- **Limitation:** Data already sent to OpenAI for AI processing before your deletion cannot be recalled. This is outside our control and is disclosed in the Terms of Service.

## 15. Data Breach Notification

In the event of a data breach affecting your personal information, we will notify affected users as promptly as possible with details of the breach and steps taken to mitigate it.

## 16. Children's Privacy

Our Service is not addressed to anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13.

## 17. Links to Other Sites

Our Service may contain links to sites that are not operated by us (such as Auth0 or GitHub). We strongly advise you to review the privacy policy of every site you visit; we have no control over and assume no responsibility for their content or practices.

## 18. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will post the new policy on this page and update the "Last updated" date at the top. Continued use of the Service after changes constitutes acceptance of the updated policy.

## 19. Contact Us

For questions about this Privacy Policy, contact Nam Le through [the StudyFlow repository](https://github.com/KuanKongy/StudyFlow).
