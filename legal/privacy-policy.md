# Privacy Policy

**Last updated:** 09/14/2026

---

## 1. Introduction

Welcome to **StudyFlow** (**"Company"**, **"we"**, **"our"**, **"us"**), a collaborative study platform operated by Nam Le.

Privacy policies have a reputation for being unreadable, so this one tries to be the rare privacy policy that is actually worth reading. The short version: we collect only what we need to run StudyFlow, we never sell your data, and when you delete your account we actually delete your data. The longer version follows.

This Privacy Policy governs your use of the StudyFlow web application (**"Service"**) and explains how we collect, safeguard and disclose information that results from your use of the Service. We use your data only to provide the Service. By using the Service, you agree to the collection and use of information in accordance with this policy. Unless otherwise defined here, terms used in this Privacy Policy have the same meanings as in our [Terms of Service](./terms-of-service.md).

## 2. Definitions

A few terms come up again and again, so let's define them once:

- **"Service"** means the StudyFlow web application operated by Nam Le.
- **"Personal Data"** means data about a living individual who can be identified from that data (or from that data combined with other information in our possession).
- **"User-Authored Content"** means the notes, summaries, and flashcards you create or generate on the Service.
- **"User"** means you — the individual using our Service.

## 3. Information Collection and Use

We collect only the information needed to operate the Service: identity information provided by Auth0 and the study content you author. We do not collect usage analytics or tracking data.

## 4. Types of Data Collected

### Personal Data (from Auth0)

When you sign in, Auth0 shares a small identity profile with us: your email address (for account identification), your display name, a profile picture URL linked from your auth provider, and an Auth0 subject ID — a pseudonymous identifier that lets us recognize your account without knowing anything else about you.

### User-Authored Content

We also store the notes, flashcards, and summaries you create. This content could contain personal information — names, course information, personal reflections — so please be thoughtful about what you enter. You are responsible for the content you write.

## 5. Use of Data

Your data is used for exactly three things: providing the StudyFlow service (storing materials, managing groups, enabling collaboration), generating AI summaries and flashcards when you explicitly request them, and authenticating your identity to keep your account secure. We do **not** use your data for advertising, profiling, or any purpose other than the StudyFlow service.

## 6. Retention of Data

We retain your Personal Data and User-Authored Content only for as long as your account exists. Deleting your account triggers a full cascade: your notes, materials, flashcards, jobs, and group audit-log entries are deleted from our database; your cache entries and queued jobs are purged; and your membership is removed from all groups. Your Auth0 identity is retained so you can sign in again later without repeating onboarding.

## 7. Transfer of Data

All persistent StudyFlow-managed storage (MongoDB Atlas and hosted Redis) is configured in ca-central-1 (Canada). The sole exception is AI processing: when you use AI features, your note content is transmitted to OpenAI's servers in the United States. This is disclosed before your first use of AI features.

**CLOUD Act Disclosure:** MongoDB Atlas is operated by MongoDB, Inc. and OpenAI is a US-based company; both are subject to the US CLOUD Act. Despite ca-central-1 storage, US authorities could potentially compel access to data held by these providers.

## 8. Disclosure of Data

Your data is never sold, shared with advertisers, or used for any purpose other than the StudyFlow service. There is no advertising on StudyFlow. We may disclose Personal Data if required to do so by law.

## 9. Security of Data

Your study materials live in MongoDB Atlas in ca-central-1 (Canada), encrypted at rest with MongoDB Atlas Transparent Data Encryption (AES-256), and our cache is a hosted Redis instance in the same region with TLS encryption in transit. The security of your data is important to us, but please remember that no method of transmission over the Internet or method of electronic storage is 100% secure — we do our best, but we cannot guarantee absolute security.

## 10. Service Providers

We share data with exactly two third parties, and only what each needs to do its job:

| Provider | Purpose | Data Shared | Location |
|----------|---------|-------------|----------|
| Auth0 | Authentication | Email, name, picture | US |
| OpenAI | AI generation | Note content | US |

## 11. Analytics

We do not use third-party analytics services to monitor and analyze the use of our Service. There is nothing watching you study.

## 12. Cookies and Local Storage

Auth0 JWT and refresh tokens are stored in browser localStorage for session management. We use no tracking cookies, analytics cookies, or third-party tracking scripts.

## 13. AI Processing and Training Data

When you explicitly request AI features, your note content is sent to OpenAI for processing. OpenAI may retain API call logs per their own data retention policy; StudyFlow has no control over data once it reaches OpenAI, and content already sent cannot be recalled or deleted after the fact — even if you delete your account.

## 14. Your Data Protection Rights

Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA) you have rights of access to and correction of your personal information. On StudyFlow, those rights are built into the product:

- **Access:** everything we hold about you is visible through the StudyFlow interface.
- **Correction:** you can edit your profile and materials at any time.
- **Deletion:** you can delete your account at any time; see Section 6 (Retention of Data) for the full cascade.
- **Limitation:** the one thing we cannot do is recall data already sent to OpenAI.

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
