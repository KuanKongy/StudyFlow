import { FaqContent } from '@/components/FaqContent';

/** In-app FAQ page, rendered inside AppLayout like Notes or Summaries. */
export default function AppFaq() {
  return (
    <div className="px-4 py-5 sm:p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">FAQ</h1>
        <p className="text-muted-foreground">
          Quick answers about StudyFlow — groups, notes, and the AI features.
        </p>
      </div>
      <FaqContent />
    </div>
  );
}
