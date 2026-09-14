export function TosContent() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p><strong>Last updated:</strong> 09/13/2026</p>

      <h2>1. Introduction</h2>
      <p>Welcome to <strong>StudyFlow</strong> (<strong>"Company"</strong>, <strong>"we"</strong>, <strong>"our"</strong>, <strong>"us"</strong>), a collaborative study platform operated by Nam Le. These Terms of Service (<strong>"Terms"</strong>) govern your use of the StudyFlow web application (<strong>"Service"</strong>).</p>
      <p>Our Privacy Policy also governs your use of our Service and explains how we collect, safeguard and disclose information that results from your use of StudyFlow. Please read it at <a href="/privacy">Privacy Policy</a>.</p>
      <p>Your agreement with us includes these Terms and our Privacy Policy (<strong>"Agreements"</strong>). You acknowledge that you have read and understood the Agreements, and agree to be bound by them. If you do not agree with (or cannot comply with) the Agreements, you may not use the Service — but please let us know by opening an issue on <a href="https://github.com/KuanKongy/StudyFlow" target="_blank" rel="noopener noreferrer">the StudyFlow repository</a> so we can try to find a solution. These Terms apply to all visitors, users and others who wish to access or use the Service.</p>

      <h2>2. Accounts</h2>
      <ul>
        <li>Accounts are created through Auth0, a third-party authentication provider.</li>
        <li>One account per person. You must provide accurate information during registration.</li>
        <li>Usernames must be unique and may only contain letters, numbers, periods, and underscores, with a maximum of 30 characters.</li>
        <li>Display names may contain spaces and emojis, with a maximum of 30 characters.</li>
        <li>You are responsible for maintaining the security of your account credentials.</li>
      </ul>

      <h2>3. Content</h2>
      <ul>
        <li><strong>Ownership:</strong> Topics are owned by their creator. Notes, summaries, and flashcard sets are owned by the user who created them.</li>
        <li><strong>Collaboration:</strong> Group members can view and edit shared materials collaboratively. No user can delete materials they do not own.</li>
        <li><strong>Topic Deletion:</strong> Deleting a topic permanently removes all materials within it, including materials created by other users.</li>
        <li><strong>Group Deletion:</strong> If a group is deleted, topics shared with that group are detached and revert to private status — they are not destroyed.</li>
        <li>You are responsible for the content you create and share on the Service.</li>
      </ul>

      <h2>4. AI Processing Disclosure</h2>
      <p>StudyFlow uses OpenAI to generate summaries and flashcards from your notes. By using AI features, you acknowledge:</p>
      <ul>
        <li><strong>Data Transit:</strong> Your note content is sent to OpenAI's servers in the United States. Data may be processed outside of Canada.</li>
        <li><strong>CLOUD Act:</strong> OpenAI is subject to the US CLOUD Act. US authorities may compel disclosure of data processed by OpenAI.</li>
        <li><strong>Retention:</strong> OpenAI may retain API call logs per their data retention policy.</li>
        <li><strong>Irrecoverable Data:</strong> Content already sent to OpenAI cannot be recalled or deleted after the fact, even if you delete your account.</li>
        <li><strong>Disclosure Before Use:</strong> You will be informed of these facts before your first use of AI features.</li>
      </ul>

      <h2>5. Usage Limits</h2>
      <ul>
        <li>10 AI job requests per user per hour.</li>
        <li>Notes exceeding 50,000 characters are rejected for AI processing.</li>
      </ul>
      <p>These limits exist to prevent cost overruns and ensure fair usage across all users.</p>

      <h2>6. Prohibited Uses</h2>
      <p>You may use the Service only for lawful purposes. You agree not to:</p>
      <ul>
        <li>Upload illegal, harmful, abusive, or threatening content.</li>
        <li>Use automated tools to scrape or abuse the platform or its AI features.</li>
        <li>Impersonate other users or misrepresent your identity.</li>
        <li>Attempt to access materials or accounts that do not belong to you.</li>
        <li>Circumvent rate limits, access controls, or security measures.</li>
      </ul>

      <h2>7. Group Rules</h2>
      <ul>
        <li>Group owners control membership and can remove members or delete the group.</li>
        <li>Group owners cannot be removed from their own group.</li>
        <li>All membership changes are logged in an audit trail.</li>
        <li>Members may leave a group at any time.</li>
      </ul>

      <h2>8. Account Deletion</h2>
      <p>You may delete your account at any time from the Profile page. All StudyFlow-managed data is removed from our database, cache, job queue, and group memberships. Your Auth0 identity is retained so you can sign in again later without repeating onboarding. Data already processed by OpenAI is outside our control.</p>

      <h2>9. Intellectual Property</h2>
      <p>The Service and its original content (excluding content provided by users), features and functionality are and will remain the exclusive property of StudyFlow and its operator, Nam Le. You may not copy, redistribute, reverse-engineer, decompile, or claim ownership of the platform or any part of it without explicit written permission.</p>

      <h2>10. Analytics</h2>
      <p>We do not use third-party analytics or tracking services to monitor your use of the Service.</p>

      <h2>11. No Use By Minors</h2>
      <p>The Service is intended for students and other users who are at least 13 years of age. By accessing or using the Service, you warrant that you meet this requirement.</p>

      <h2>12. Error Reporting and Feedback</h2>
      <p>You may report errors, bugs, or other feedback by opening an issue on <a href="https://github.com/KuanKongy/StudyFlow" target="_blank" rel="noopener noreferrer">the StudyFlow repository</a>. We may use your feedback without any obligation to you.</p>

      <h2>13. Links To Other Web Sites</h2>
      <p>Our Service may contain links to third-party web sites or services that are not owned or controlled by StudyFlow (such as Auth0 or GitHub). We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party sites or services.</p>

      <h2>14. Disclaimer Of Warranty</h2>
      <p>The Service is provided "as is" and "as available", for educational purposes, without warranties of any kind. We make no warranties regarding continuous, uninterrupted, or error-free operation of the platform, the accuracy or quality of AI-generated content, or data permanence beyond the deletion guarantees stated in these Terms.</p>

      <h2>15. Limitation Of Liability</h2>
      <p>To the fullest extent permitted by law, StudyFlow and its operator shall not be liable for any indirect, incidental, or consequential damages arising from use of the Service.</p>

      <h2>16. Termination</h2>
      <p>We may suspend or terminate accounts that violate these Terms, without prior notice. Upon termination, your data will be handled according to Section 8 (Account Deletion).</p>

      <h2>17. Governing Law</h2>
      <p>These Terms shall be governed and construed in accordance with the laws of the Province of British Columbia, Canada, without regard to its conflict of law provisions.</p>

      <h2>18. Changes To Service</h2>
      <p>We reserve the right to withdraw or amend our Service, and any feature we provide via the Service, in our sole discretion without notice. We will not be liable if, for any reason, all or any part of the Service is unavailable at any time.</p>

      <h2>19. Amendments To Terms</h2>
      <p>We may amend these Terms at any time by posting the amended terms on this page. It is your responsibility to review these Terms periodically. Your continued use of the Service following the posting of revised Terms means that you accept and agree to the changes.</p>

      <h2>20. Waiver And Severability</h2>
      <p>No waiver by us of any term or condition set forth in these Terms shall be deemed a further or continuing waiver of such term or condition. If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions will continue in full force and effect.</p>

      <h2>21. Acknowledgement</h2>
      <p>BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND AGREE TO BE BOUND BY THEM.</p>

      <h2>22. Contact Us</h2>
      <p>For questions about these Terms, contact Nam Le through <a href="https://github.com/KuanKongy/StudyFlow" target="_blank" rel="noopener noreferrer">the StudyFlow repository</a>.</p>
    </>
  );
}
