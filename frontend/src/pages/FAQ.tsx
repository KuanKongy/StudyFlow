import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function FAQ() {
  const navigate = useNavigate();
  const canGoBack = (window.history.state?.idx ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => (canGoBack ? navigate(-1) : navigate('/login'))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="prose dark:prose-invert max-w-none p-4 sm:p-8">
            <h1>Frequently Asked Questions</h1>

            <h2>What is StudyFlow?</h2>
            <p>StudyFlow is a collaborative study platform. You organize your work into topics, write notes, and let AI turn those notes into summaries and flashcards. Topics can be shared with study groups so classmates can learn together.</p>

            <h2>How do groups and topics work?</h2>
            <ul>
              <li><strong>Groups</strong> connect you with classmates. Create a group and share its join code, or join an existing group with a code from a friend.</li>
              <li><strong>Topics</strong> are folders for your study materials (notes, summaries, flashcard sets). A topic is private by default; sharing it with one of your groups makes its materials visible to every member.</li>
              <li>Group owners control membership. If a group is deleted, shared topics simply revert to private — nobody's work is destroyed.</li>
            </ul>

            <h2>How do notes work?</h2>
            <p>Notes are free-form text and support Markdown formatting (headings, lists, tables, and more). On a note page you can switch between the raw Markdown editor and a rendered preview. Group members can view and edit shared notes, but only the owner can save changes to or delete a note.</p>

            <h2>How do AI summaries and flashcards work?</h2>
            <p>From any note, use <strong>AI Actions</strong> to generate a summary or a flashcard set. Your request becomes a job in a queue — you can watch its progress on the <strong>AI Jobs</strong> page, and the result appears in the same topic as the source note. Summaries can also be regenerated later to reflect changes in the note.</p>
            <p>Generation is powered by OpenAI, which means your note content is sent to OpenAI's servers in the United States. You will see a disclosure explaining this before your first AI request, and the details are covered in our <a href="/privacy">Privacy Policy</a>.</p>

            <h2>Are there limits on AI features?</h2>
            <ul>
              <li>Each user can run <strong>10 AI jobs per hour</strong> (summaries and flashcards combined).</li>
              <li>Notes longer than <strong>50,000 characters</strong> are rejected for AI processing.</li>
            </ul>
            <p>These limits keep the service fast and fair for everyone.</p>

            <h2>Who can see and edit my materials?</h2>
            <p>Materials in private topics are visible only to you. Materials in a topic shared with a group are visible to all group members, and members can collaborate on them — but nobody can delete materials they do not own.</p>

            <h2>How do I delete my account or data?</h2>
            <p>You can delete individual materials at any time, or delete your whole account from the Profile page. Account deletion removes all your StudyFlow data — notes, materials, flashcards, jobs, and group memberships. See the <a href="/terms">Terms of Service</a> for details.</p>

            <h2>Where can I get help?</h2>
            <p>Questions, bug reports, and feedback are welcome on our <a href="/contact">Contact</a> page.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
