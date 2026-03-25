export function TosContent() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p><strong>Effective Date:</strong> March 18, 2026</p>

      <p>Welcome to StudyFlow. By accessing or using StudyFlow, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>

      <h2>1. Ownership and Intellectual Property</h2>
      <p>StudyFlow is owned and operated by Nam Le. All rights in the platform, including its source code, design, branding, and documentation, are reserved. You may not copy, redistribute, reverse-engineer, decompile, or claim ownership of the platform or any part of it without explicit written permission.</p>

      <h2>2. Account Creation and Authentication</h2>
      <ul>
        <li>Accounts are created through Auth0, a third-party authentication provider.</li>
        <li>One account per person. You must provide accurate information during registration.</li>
        <li>Usernames must be unique and may only contain letters, numbers, periods, and underscores, with a maximum of 30 characters.</li>
        <li>Display names may contain spaces and emojis, with a maximum of 30 characters.</li>
        <li>You are responsible for maintaining the security of your account credentials.</li>
      </ul>

      <h2>3. User-Generated Content</h2>
      <ul>
        <li><strong>Ownership:</strong> Topics are owned by their creator. Notes, summaries, and flashcard sets are owned by the user who created them.</li>
        <li><strong>Collaboration:</strong> Group members can view and edit shared materials collaboratively. No user can delete materials they do not own.</li>
        <li><strong>Topic Deletion:</strong> Deleting a topic permanently removes all materials within it, including materials created by other users.</li>
        <li><strong>Group Deletion:</strong> If a group is deleted, topics shared with that group are detached and revert to private status — they are not destroyed.</li>
      </ul>

      <h2>4. AI Processing Disclosure</h2>
      <p>StudyFlow uses OpenAI to generate summaries and flashcards from your notes. By using AI features, you acknowledge:</p>
      <ul>
        <li><strong>Data Transit:</strong> Your note content is sent to OpenAI's servers in the United States. Data may be processed outside of Canada.</li>
        <li><strong>CLOUD Act:</strong> OpenAI is subject to the US CLOUD Act. US authorities may compel disclosure of data processed by OpenAI.</li>
        <li><strong>Retention:</strong> OpenAI may retain API call logs per their data retention policy.</li>
        <li><strong>Irrecoverable Data:</strong> Content already sent to OpenAI cannot be recalled or deleted after the fact, even if you delete your account.</li>
      </ul>

      <h2>5. Usage Limits</h2>
      <ul>
        <li>10 AI job requests per user per hour.</li>
        <li>Notes exceeding 50,000 characters are rejected for AI processing.</li>
      </ul>

      <h2>6. Account Deletion</h2>
      <p>You may delete your account at any time. All your data is removed from our database, cache, job queue, and group memberships. Your Auth0 identity is deleted. Data already processed by OpenAI is outside our control.</p>

      <h2>7. Group Rules</h2>
      <ul>
        <li>Group owners control membership and can remove members or delete the group.</li>
        <li>All membership changes are logged in an audit trail.</li>
        <li>Members may leave a group at any time.</li>
      </ul>

      <h2>8. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Upload illegal, harmful, abusive, or threatening content.</li>
        <li>Use automated tools to scrape or abuse the platform or its AI features.</li>
        <li>Impersonate other users or misrepresent your identity.</li>
        <li>Attempt to access materials or accounts that do not belong to you.</li>
        <li>Circumvent rate limits, access controls, or security measures.</li>
      </ul>

      <h2>9. Termination</h2>
      <p>StudyFlow reserves the right to suspend or terminate accounts that violate these Terms without prior notice.</p>

      <h2>10. Disclaimer</h2>
      <p>StudyFlow is provided "as is" for educational purposes. No warranties are made regarding continuous operation, AI content accuracy, or data permanence beyond stated deletion guarantees.</p>

      <h2>11. Changes</h2>
      <p>We may update these Terms from time to time. Continued use constitutes acceptance.</p>

      <h2>12. Contact</h2>
      <p>Questions? Contact Nam Le through <a href="https://github.com/KuanKongy/StudyFlow" target="_blank" rel="noopener noreferrer">the StudyFlow repository</a>.</p>
    </>
  );
}
