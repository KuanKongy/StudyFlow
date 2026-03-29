# Terms of Service

**Effective Date:** March 18, 2026

**Last Updated:** March 18, 2026

Welcome to StudyFlow. By accessing or using StudyFlow, you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the platform.

---

## 1. Ownership and Intellectual Property

StudyFlow is owned and operated by Nam Le. All rights in the platform, including its source code, design, branding, and documentation, are reserved. You may not copy, redistribute, reverse-engineer, decompile, or claim ownership of the platform or any part of it without explicit written permission.

## 2. Account Creation and Authentication

- Accounts are created through Auth0, a third-party authentication provider.
- One account per person. You must provide accurate information during registration.
- Usernames must be unique and may only contain letters, numbers, periods, and underscores, with a maximum of 30 characters.
- Display names may contain spaces and emojis, with a maximum of 30 characters.
- You are responsible for maintaining the security of your account credentials.

## 3. User-Generated Content

- **Ownership:** Topics are owned by their creator. Notes, summaries, and flashcard sets are owned by the user who created them.
- **Collaboration:** Group members can view and edit shared materials collaboratively. However, no user can delete materials they do not own.
- **Topic Deletion:** Deleting a topic permanently removes all materials within it, including materials created by other users. Exercise caution.
- **Group Deletion:** If a group is deleted by its owner, topics shared with that group are detached and revert to private status — they are not destroyed. Your work is preserved.

## 4. AI Processing Disclosure

StudyFlow uses OpenAI to generate summaries and flashcards from your notes. By using AI features, you acknowledge and agree to the following:

- **Data Transit:** Your note content is sent to OpenAI's API servers, which are located in the United States. This means your data may be processed outside of Canada.
- **CLOUD Act:** OpenAI is a US-based company subject to the US CLOUD Act. US authorities may compel disclosure of data processed by OpenAI.
- **Retention:** OpenAI may retain API call logs according to their own data retention policy. StudyFlow has no control over data once it reaches OpenAI.
- **Irrecoverable Data:** Content already sent to OpenAI for AI processing cannot be recalled or deleted after the fact — even if you delete your account. This is an honest limitation.
- **Disclosure Before Use:** You will be informed of these facts before your first use of AI features.

## 5. Usage Limits

- Each user is limited to 10 AI job requests (summaries and flashcards combined) per hour.
- Notes exceeding 50,000 characters are rejected for AI processing.
- These limits exist to prevent cost overruns and ensure fair usage across all users.

## 6. Account Deletion

- You may delete your account at any time from the Profile page.
- Deletion removes all StudyFlow-managed data from our database (MongoDB), cache (Redis), job queue, and group memberships. Your Auth0 identity is retained so you can sign in again later without repeating onboarding.
- **Limitation:** Data already processed by OpenAI before deletion is outside our control and cannot be recalled. This caveat is an honest disclosure, not a loophole.

## 7. Group Rules

- Group owners control membership. Only the group owner can remove members or delete the group.
- All membership changes (additions, removals, joins, leaves) are logged in an audit trail for accountability.
- Group owners cannot be removed from their own group.
- Members may leave a group at any time.

## 8. Acceptable Use

You agree not to:
- Upload illegal, harmful, abusive, or threatening content.
- Use automated tools to scrape, crawl, or abuse the platform or its AI features.
- Impersonate other users or misrepresent your identity.
- Attempt to access materials, groups, or accounts that do not belong to you.
- Circumvent rate limits, access controls, or other security measures.

## 9. Termination

StudyFlow reserves the right to suspend or terminate accounts that violate these Terms, without prior notice. Upon termination, your data will be handled according to Section 6.

## 10. Disclaimer and Limitation of Liability

StudyFlow is provided "as is" for educational purposes. We make no warranties regarding:
- Continuous, uninterrupted, or error-free operation of the platform.
- The accuracy or quality of AI-generated content.
- Data permanence beyond the deletion guarantees stated in Section 6.

To the fullest extent permitted by law, StudyFlow and its owner shall not be liable for any indirect, incidental, or consequential damages arising from use of the platform.

## 11. Changes to These Terms

We may update these Terms from time to time. Continued use of StudyFlow after changes constitutes acceptance of the updated Terms.

## 12. Contact

For questions about these Terms, contact the platform owner, Nam Le, through the repository at [KuanKongy/StudyFlow](https://github.com/KuanKongy/StudyFlow).
