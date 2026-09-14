export function TosContent() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p><strong>Last updated:</strong> 09/14/2026</p>

      <h2>1. Introduction</h2>
      <p>Welcome to <strong>StudyFlow</strong> (<strong>"Company"</strong>, <strong>"we"</strong>, <strong>"our"</strong>, <strong>"us"</strong>)! As you have just clicked our Terms of Service, please pause, grab a cup of coffee and carefully read the following pages. It will take you approximately 10 minutes.</p>
      <p>These Terms of Service (<strong>"Terms"</strong>) govern your use of the StudyFlow web application (<strong>"Service"</strong>), a collaborative study platform operated by Nam Le.</p>
      <p>Our Privacy Policy also governs your use of our Service and explains how we collect, safeguard and disclose information that results from your use of StudyFlow. Please read it at <a href="/privacy">Privacy Policy</a>.</p>
      <p>Your agreement with us includes these Terms and our Privacy Policy (<strong>"Agreements"</strong>). You acknowledge that you have read and understood the Agreements, and agree to be bound by them. If you do not agree with (or cannot comply with) the Agreements, you may not use the Service — but please let us know by opening an issue on <a href="https://github.com/KuanKongy/StudyFlow" target="_blank" rel="noopener noreferrer">the StudyFlow repository</a> so we can try to find a solution. These Terms apply to all visitors, users and others who wish to access or use the Service.</p>
      <p>Thank you for being responsible.</p>

      <h2>2. Accounts</h2>
      <p>When you create an account with us, you do so through Auth0, a third-party authentication provider. We keep the rules simple: one account per person, and accurate information during registration. Your username must be unique and may only contain letters, numbers, periods, and underscores (up to 30 characters). Your display name is more relaxed — spaces and emojis are welcome, up to the same 30 characters. You are responsible for maintaining the security of your account credentials, so please keep them safe.</p>

      <h2>3. Content</h2>
      <p>StudyFlow revolves around the material you create: topics, notes, summaries, and flashcard sets (<strong>"Content"</strong>). What you make is yours — topics belong to their creator, and notes, summaries, and flashcard sets belong to the user who created them. Group members can view and edit shared materials collaboratively, but no one can delete materials they do not own. You are responsible for the Content you create and share on the Service, including its legality and appropriateness.</p>
      <p>Two deletion rules are worth knowing before you press any red buttons. Deleting a topic permanently removes all materials within it, including materials created by other users — so exercise caution. Deleting a group is gentler: topics shared with that group are simply detached and revert to private status. Your work is preserved.</p>

      <h2>4. AI Processing Disclosure</h2>
      <p>StudyFlow uses OpenAI to generate summaries and flashcards from your notes, and we want to be completely upfront about what that means. When you use an AI feature, your note content is sent to OpenAI's servers in the United States, which means your data may be processed outside of Canada. OpenAI is subject to the US CLOUD Act, so US authorities may compel disclosure of data processed by OpenAI, and OpenAI may retain API call logs according to its own data retention policy.</p>
      <p>Perhaps most importantly: content that has already been sent to OpenAI cannot be recalled or deleted after the fact, even if you later delete your account. None of this should come as a surprise when you use the Service — we show you these facts before your first use of AI features.</p>

      <h2>5. Usage Limits</h2>
      <p>To prevent cost overruns and keep the Service fair for everyone, each user may run 10 AI job requests per hour (summaries and flashcards combined), and notes exceeding 50,000 characters are rejected for AI processing.</p>

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
      <p>Study groups are run by their owners: a group owner controls membership and can remove members or delete the group, and owners cannot be removed from their own group. Every membership change is logged in an audit trail, and any member may leave a group at any time.</p>

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
      <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. The Service is offered for educational purposes, and we make no warranties regarding continuous, uninterrupted, or error-free operation of the platform, the accuracy or quality of AI-generated content, or data permanence beyond the deletion guarantees stated in these Terms.</p>

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
      <p>For questions about these Terms, contact Nam Le through <a href="https://github.com/KuanKongy/StudyFlow" target="_blank" rel="noopener noreferrer">the StudyFlow repository</a> — or see the <a href="/contact">Contact</a> page for more ways to reach us.</p>
    </>
  );
}
