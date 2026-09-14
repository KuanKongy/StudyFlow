export function PpContent() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> 09/13/2026</p>

      <h2>1. Introduction</h2>
      <p>Welcome to <strong>StudyFlow</strong> (<strong>"Company"</strong>, <strong>"we"</strong>, <strong>"our"</strong>, <strong>"us"</strong>), a collaborative study platform operated by Nam Le.</p>
      <p>Our Privacy Policy governs your use of the StudyFlow web application (<strong>"Service"</strong>) and explains how we collect, safeguard and disclose information that results from your use of the Service. We use your data only to provide the Service. By using the Service, you agree to the collection and use of information in accordance with this policy. Unless otherwise defined here, terms used in this Privacy Policy have the same meanings as in our <a href="/terms">Terms of Service</a>.</p>

      <h2>2. Definitions</h2>
      <ul>
        <li><strong>SERVICE</strong> means the StudyFlow web application operated by Nam Le.</li>
        <li><strong>PERSONAL DATA</strong> means data about a living individual who can be identified from that data (or from that data combined with other information in our possession).</li>
        <li><strong>USER-AUTHORED CONTENT</strong> means the notes, summaries, and flashcards you create or generate on the Service.</li>
        <li><strong>USER</strong> means the individual using our Service.</li>
      </ul>

      <h2>3. Information Collection and Use</h2>
      <p>We collect only the information needed to operate the Service: identity information provided by Auth0 and the study content you author. We do not collect usage analytics or tracking data.</p>

      <h2>4. Types of Data Collected</h2>
      <h3>Personal Data (from Auth0)</h3>
      <ul>
        <li><strong>Email address</strong> — for account identification.</li>
        <li><strong>Display name</strong> — your real name or chosen display name.</li>
        <li><strong>Profile picture URL</strong> — linked from your auth provider.</li>
        <li><strong>Auth0 subject ID</strong> — a pseudonymous identifier.</li>
      </ul>
      <h3>User-Authored Content</h3>
      <p>Notes, flashcards, and summaries you create. This content could contain personal information including names, course information, and personal reflections. You are responsible for the content you enter.</p>

      <h2>5. Use of Data</h2>
      <ul>
        <li>To provide the StudyFlow service: storing materials, managing groups, enabling collaboration.</li>
        <li>To generate AI summaries and flashcards when you explicitly request them.</li>
        <li>To authenticate your identity and secure your account.</li>
      </ul>
      <p>We do <strong>not</strong> use your data for advertising, profiling, or any purpose other than the StudyFlow service.</p>

      <h2>6. Retention of Data</h2>
      <p>We retain your Personal Data and User-Authored Content only for as long as your account exists. Deleting your account triggers a full cascade: your notes, materials, flashcards, jobs, and group audit-log entries are deleted from our database; your cache entries and queued jobs are purged; and your membership is removed from all groups. Your Auth0 identity is retained so you can sign in again later without repeating onboarding.</p>

      <h2>7. Transfer of Data</h2>
      <p>All persistent StudyFlow-managed storage is configured in ca-central-1 (Canada). The sole exception is AI processing: when you use AI features, your note content is transmitted to OpenAI's servers in the United States. This is disclosed before your first use of AI features.</p>
      <p><strong>CLOUD Act Disclosure:</strong> MongoDB Atlas is operated by MongoDB, Inc. and OpenAI is a US-based company; both are subject to the US CLOUD Act. Despite ca-central-1 storage, US authorities could potentially compel access to data held by these providers.</p>

      <h2>8. Disclosure of Data</h2>
      <p>Your data is never sold, shared with advertisers, or used for any purpose other than the StudyFlow service. There is no advertising on StudyFlow. We may disclose Personal Data if required to do so by law.</p>

      <h2>9. Security of Data</h2>
      <ul>
        <li><strong>Database:</strong> MongoDB Atlas in ca-central-1 (Canada). Encrypted at rest using MongoDB Atlas Transparent Data Encryption (AES-256).</li>
        <li><strong>Cache:</strong> Hosted Redis in ca-central-1 with TLS encryption in transit.</li>
      </ul>
      <p>The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure.</p>

      <h2>10. Service Providers</h2>
      <table>
        <thead><tr><th>Provider</th><th>Purpose</th><th>Data Shared</th><th>Location</th></tr></thead>
        <tbody>
          <tr><td>Auth0</td><td>Authentication</td><td>Email, name, picture</td><td>US</td></tr>
          <tr><td>OpenAI</td><td>AI generation</td><td>Note content</td><td>US</td></tr>
        </tbody>
      </table>

      <h2>11. Analytics</h2>
      <p>We do not use third-party analytics services to monitor and analyze the use of our Service.</p>

      <h2>12. Cookies and Local Storage</h2>
      <p>Auth0 JWT and refresh tokens are stored in browser localStorage for session management. We use no tracking cookies, analytics cookies, or third-party tracking scripts.</p>

      <h2>13. AI Processing and Training Data</h2>
      <p>When you explicitly request AI features, your note content is sent to OpenAI for processing. OpenAI may retain API call logs per their own data retention policy; StudyFlow has no control over data once it reaches OpenAI, and content already sent cannot be recalled or deleted after the fact — even if you delete your account.</p>

      <h2>14. Your Data Protection Rights</h2>
      <p>Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA) you have rights of access to and correction of your personal information. On StudyFlow:</p>
      <ul>
        <li><strong>Access:</strong> View all your data through the StudyFlow interface.</li>
        <li><strong>Correction:</strong> Edit your profile and materials at any time.</li>
        <li><strong>Deletion:</strong> Delete your account at any time; see Section 6 (Retention of Data) for the full cascade.</li>
        <li><strong>Limitation:</strong> Data already sent to OpenAI cannot be recalled.</li>
      </ul>

      <h2>15. Data Breach Notification</h2>
      <p>In the event of a data breach affecting your personal information, we will notify affected users as promptly as possible with details of the breach and steps taken to mitigate it.</p>

      <h2>16. Children's Privacy</h2>
      <p>Our Service is not addressed to anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13.</p>

      <h2>17. Links to Other Sites</h2>
      <p>Our Service may contain links to sites that are not operated by us (such as Auth0 or GitHub). We strongly advise you to review the privacy policy of every site you visit; we have no control over and assume no responsibility for their content or practices.</p>

      <h2>18. Changes to This Privacy Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will post the new policy on this page and update the "Last updated" date at the top. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>

      <h2>19. Contact Us</h2>
      <p>For questions about this Privacy Policy, contact Nam Le through <a href="https://github.com/KuanKongy/StudyFlow" target="_blank" rel="noopener noreferrer">the StudyFlow repository</a>.</p>
    </>
  );
}
