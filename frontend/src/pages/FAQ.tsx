import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const linkClass = 'underline underline-offset-2 hover:text-foreground';
const strongClass = 'font-medium text-foreground';

interface FaqItem {
  id: string;
  question: string;
  answer: ReactNode;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-studyflow',
    question: 'What is StudyFlow?',
    answer: (
      <p>
        StudyFlow is a collaborative study platform. You organize your work into topics, write
        notes, and let AI turn those notes into summaries and flashcards. Topics can be shared with
        study groups so classmates can learn together.
      </p>
    ),
  },
  {
    id: 'groups-and-topics',
    question: 'How do groups and topics work?',
    answer: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong className={strongClass}>Groups</strong> connect you with classmates. Create a
          group and share its join code, or join an existing group with a code from a friend.
        </li>
        <li>
          <strong className={strongClass}>Topics</strong> are folders for your study materials
          (notes, summaries, flashcard sets). A topic is private by default; sharing it with one of
          your groups makes its materials visible to every member.
        </li>
        <li>
          Group owners control membership. If a group is deleted, shared topics simply revert to
          private — nobody's work is destroyed.
        </li>
      </ul>
    ),
  },
  {
    id: 'notes',
    question: 'How do notes work?',
    answer: (
      <p>
        Notes are free-form text and support Markdown formatting (headings, lists, tables, and
        more). On a note page you can switch between the raw Markdown editor and a rendered
        preview. Group members can view and edit shared notes, but only the owner can save changes
        to or delete a note.
      </p>
    ),
  },
  {
    id: 'ai-summaries-flashcards',
    question: 'How do AI summaries and flashcards work?',
    answer: (
      <>
        <p>
          From any note, use <strong className={strongClass}>AI Actions</strong> to generate a
          summary or a flashcard set. Your request becomes a job in a queue — you can watch its
          progress on the <strong className={strongClass}>AI Jobs</strong> page, and the result
          appears in the same topic as the source note. Summaries can also be regenerated later to
          reflect changes in the note.
        </p>
        <p>
          Generation is powered by OpenAI, which means your note content is sent to OpenAI's
          servers in the United States. You will see a disclosure explaining this before your first
          AI request, and the details are covered in our{' '}
          <Link to="/privacy" className={linkClass}>Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'ai-limits',
    question: 'Are there limits on AI features?',
    answer: (
      <>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Each user can run <strong className={strongClass}>10 AI jobs per hour</strong>{' '}
            (summaries and flashcards combined).
          </li>
          <li>
            Notes longer than <strong className={strongClass}>50,000 characters</strong> are
            rejected for AI processing.
          </li>
        </ul>
        <p>These limits keep the service fast and fair for everyone.</p>
      </>
    ),
  },
  {
    id: 'visibility',
    question: 'Who can see and edit my materials?',
    answer: (
      <p>
        Materials in private topics are visible only to you. Materials in a topic shared with a
        group are visible to all group members, and members can collaborate on them — but nobody
        can delete materials they do not own.
      </p>
    ),
  },
  {
    id: 'delete-account',
    question: 'How do I delete my account or data?',
    answer: (
      <p>
        You can delete individual materials at any time, or delete your whole account from the
        Profile page. Account deletion removes all your StudyFlow data — notes, materials,
        flashcards, jobs, and group memberships. See the{' '}
        <Link to="/terms" className={linkClass}>Terms of Service</Link> for details.
      </p>
    ),
  },
  {
    id: 'get-help',
    question: 'Where can I get help?',
    answer: (
      <p>
        Questions, bug reports, and feedback are welcome on our{' '}
        <Link to="/contact" className={linkClass}>Contact</Link> page.
      </p>
    ),
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <BackButton />
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">FAQ</h1>
          <p className="mt-1 text-muted-foreground">
            Quick answers about StudyFlow — groups, notes, and the AI features.
          </p>
        </div>
        <Card>
          <CardContent className="p-5">
            <Accordion type="multiple">
              {FAQ_ITEMS.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="last:border-b-0">
                  <AccordionTrigger className="text-left text-sm font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Looking for the fine print? Read our{' '}
          <Link to="/terms" className={linkClass}>Terms of Service</Link> and{' '}
          <Link to="/privacy" className={linkClass}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
