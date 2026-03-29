export function PpContent() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p><strong>Effective Date:</strong> March 18, 2026</p>

      <p>This Privacy Policy describes how StudyFlow collects, uses, stores, and protects your personal information.</p>

      <h2>1. Information We Collect</h2>
      <h3>From Auth0</h3>
      <ul>
        <li><strong>Email address</strong> — for account identification.</li>
        <li><strong>Display name</strong> — your real name or chosen display name.</li>
        <li><strong>Profile picture URL</strong> — linked from your auth provider.</li>
        <li><strong>Auth0 subject ID</strong> — a pseudonymous identifier.</li>
      </ul>
      <h3>User-Authored Content</h3>
      <p>Notes, flashcards, and summaries you create. This content could contain personal information including names, course information, and personal reflections.</p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide the StudyFlow service: storing materials, managing groups, enabling collaboration.</li>
        <li>To generate AI summaries and flashcards when you explicitly request them.</li>
        <li>To authenticate your identity and secure your account.</li>
      </ul>
      <p>We do <strong>not</strong> use your data for advertising, profiling, or any purpose other than the StudyFlow service.</p>

      <h2>3. Data Storage and Encryption</h2>
      <ul>
        <li><strong>Database:</strong> MongoDB Atlas in ca-central-1 (Canada). Encrypted at rest using MongoDB Atlas Transparent Data Encryption (AES-256).</li>
        <li><strong>Cache:</strong> Hosted Redis in ca-central-1 with TLS encryption in transit.</li>
        <li><strong>CLOUD Act Disclosure:</strong> MongoDB Atlas is operated by MongoDB, Inc. (US). Despite ca-central-1 storage, US authorities could potentially compel access under the CLOUD Act.</li>
      </ul>

      <h2>4. Third-Party Processors</h2>
      <table>
        <thead><tr><th>Provider</th><th>Purpose</th><th>Data Shared</th><th>Location</th></tr></thead>
        <tbody>
          <tr><td>Auth0</td><td>Authentication</td><td>Email, name, picture</td><td>US</td></tr>
          <tr><td>OpenAI</td><td>AI generation</td><td>Note content</td><td>US</td></tr>
        </tbody>
      </table>

      <h2>5. Data Residency</h2>
      <p>All persistent StudyFlow-managed storage is configured in ca-central-1 (Canada). The sole exception is AI processing, where note content transits to OpenAI's US servers. This is disclosed before first use.</p>

      <h2>6. Your Rights and Data Deletion</h2>
      <ul>
        <li><strong>Access:</strong> View all your data through the StudyFlow interface.</li>
        <li><strong>Deletion:</strong> Delete your account at any time. All StudyFlow-managed data is removed from MongoDB, Redis, and group memberships. Your Auth0 identity is retained so you can sign in again later without repeating onboarding.</li>
        <li><strong>Limitation:</strong> Data already sent to OpenAI cannot be recalled.</li>
      </ul>

      <h2>7. Cookies and Tokens</h2>
      <p>Auth0 JWT and refresh tokens are stored in browser localStorage. We use no tracking cookies, analytics cookies, or third-party tracking scripts.</p>

      <h2>8. Data Monetization</h2>
      <p>Your data is never sold, shared with advertisers, or used for any purpose other than the StudyFlow service. There is no advertising on StudyFlow.</p>

      <h2>9. Data Breach Notification</h2>
      <p>In the event of a data breach, affected users will be notified promptly with details and mitigation steps.</p>

      <h2>10. Changes</h2>
      <p>We may update this policy from time to time. Continued use constitutes acceptance.</p>

      <h2>11. Contact</h2>
      <p>Questions? Contact Nam Le through <a href="https://github.com/KuanKongy/StudyFlow" target="_blank" rel="noopener noreferrer">the StudyFlow repository</a>.</p>
    </>
  );
}
